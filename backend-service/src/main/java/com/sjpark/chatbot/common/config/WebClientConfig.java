package com.sjpark.chatbot.common.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Python AI 서비스 호출용
 */
@Slf4j
@Configuration
public class WebClientConfig {

  @Value("${ai.service.url:http://localhost:8000}")
  private String aiServiceUrl;

  @Value("${ai.service.timeout:30000}")
  private int timeout;

  @Bean
  public WebClient aiWebClient() {
    // HTTP 클라이언트 설정
    HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, timeout) // 연결 타임아웃 설정
        .responseTimeout(Duration.ofMillis(timeout))  // 응답 타임아웃 설정
        .doOnConnected(conn ->
            conn.addHandlerLast(new ReadTimeoutHandler(timeout, TimeUnit.MILLISECONDS))   // 읽기 타임아웃 핸들러 추가
                .addHandlerLast(new WriteTimeoutHandler(timeout, TimeUnit.MILLISECONDS)));  // 쓰기 타임아웃 핸들러 추가

    return WebClient.builder()
        .baseUrl(aiServiceUrl)
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .defaultHeader("Content-Type", "application/json")
        .filter(logRequest())   // 요청 로깅 필터
        .filter(logResponse())  // 응답 로깅 필터
        .filter(handleError())  // 에러 처리 필터
        .build();
  }

  // 요청 로깅 필터
  private ExchangeFilterFunction logRequest() {
    return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
      log.info("AI API Request: {} {}", clientRequest.method(), clientRequest.url());
      return Mono.just(clientRequest);
    });
  }

  // 응답 로깅 필터
  private ExchangeFilterFunction logResponse() {
    return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
      log.info("AI API Response Status: {}", clientResponse.statusCode());
      return Mono.just(clientResponse);
    });
  }

  // 에러 처리 필터
  private ExchangeFilterFunction handleError() {
    return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
      if (clientResponse.statusCode().isError()) {
        return clientResponse.bodyToMono(String.class)
            .flatMap(errorBody -> {
              log.error("AI API Error Response Body: {}", errorBody);
              return Mono.just(clientResponse);
            });
      }
      return Mono.just(clientResponse);
    });
  }
}
