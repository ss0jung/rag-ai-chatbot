package com.sjpark.chatbot.proxy;


import com.sjpark.chatbot.common.BusinessException;
import com.sjpark.chatbot.common.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiApiClient {

  private final WebClient aiWebClient;

  /**
   * GET 요청 (동기)
   */
  public <T> T get(String uri, Class<T> responseType) {
    return get(uri, new ParameterizedTypeReference<T>() {
      @Override
      public Class<T> getType() {
        return responseType;
      }
    });
  }

  /**
   * GET 요청 (동기, 제네릭 지원)
   */
  public <T> T get(String uri, ParameterizedTypeReference<T> responseType) {
    log.info("AI API GET: {}", uri);

    return aiWebClient.get()
        .uri(uri)
        .retrieve()
        .onStatus(status -> status.isError(), response ->
            response.bodyToMono(String.class)
                .flatMap(body -> {
                  log.error("AI API Error: {} - {}", response.statusCode(), body);
                  return Mono.error(new BusinessException(ErrorCode.AI_API_ERROR, body));
                })
        )
        .bodyToMono(responseType)
        .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
            .filter(this::isRetryableException))
        .block();
  }

  /**
   * POST 요청 (동기)
   */
  public <T, R> R post(String uri, T requestBody, Class<R> responseType) {
    return post(uri, requestBody, new ParameterizedTypeReference<R>() {
      @Override
      public Class<R> getType() {
        return responseType;
      }
    });
  }

  /**
   * POST 요청 (동기, 제네릭 지원)
   */
  public <T, R> R post(String uri, T requestBody, ParameterizedTypeReference<R> responseType) {
    log.info("AI API POST: {}", uri);

    return aiWebClient.post()
        .uri(uri)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(requestBody)
        .retrieve()
        .onStatus(status -> status.isError(), response ->
            response.bodyToMono(String.class)
                .flatMap(body -> {
                  log.error("AI API Error: {} - {}", response.statusCode(), body);
                  return Mono.error(new BusinessException(ErrorCode.AI_API_ERROR, body));
                })
        )
        .bodyToMono(responseType)
        .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
            .filter(this::isRetryableException))
        .block();
  }

  /**
   * DELETE 요청 (동기)
   */
  public <T> T delete(String uri, Class<T> responseType) {
    log.info("AI API DELETE: {}", uri);

    return aiWebClient.delete()
        .uri(uri)
        .retrieve()
        .onStatus(status -> status.isError(), response ->
            response.bodyToMono(String.class)
                .flatMap(body -> {
                  log.error("AI API Error: {} - {}", response.statusCode(), body);
                  return Mono.error(new BusinessException(ErrorCode.AI_API_ERROR, body));
                })
        )
        .bodyToMono(responseType)
        .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
            .filter(this::isRetryableException))
        .block();
  }

  /**
   * SSE 스트리밍 요청
   */
  public <T> Flux<T> stream(String uri, Object requestBody, Class<T> responseType) {
    log.info("AI API STREAM: {}", uri);

    return aiWebClient.post()
        .uri(uri)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(requestBody)
        .accept(MediaType.TEXT_EVENT_STREAM)
        .retrieve()
        .onStatus(status -> status.isError(), response ->
            response.bodyToMono(String.class)
                .flatMap(body -> {
                  log.error("AI API Stream Error: {} - {}", response.statusCode(), body);
                  return Mono.error(new BusinessException(ErrorCode.AI_API_ERROR, body));
                })
        )
        .bodyToFlux(responseType)
        .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
            .filter(this::isRetryableException));
  }

  /**
   * 헬스체크
   */
  public boolean healthCheck() {
    try {
      String result = aiWebClient.get()
          .uri("/health")
          .retrieve()
          .bodyToMono(String.class)
          .timeout(Duration.ofSeconds(5))
          .block();

      log.info("AI Service Health Check: OK");
      return result != null;
    } catch (Exception e) {
      log.error("AI Service Health Check: FAILED - {}", e.getMessage());
      return false;
    }
  }

  /**
   * 재시도 가능한 예외인지 판단
   */
  private boolean isRetryableException(Throwable throwable) {
    return throwable instanceof java.net.ConnectException
        || throwable instanceof java.util.concurrent.TimeoutException
        || throwable instanceof io.netty.handler.timeout.ReadTimeoutException;
  }
}