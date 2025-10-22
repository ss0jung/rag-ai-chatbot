package com.sjpark.chatbot.proxy;


import com.sjpark.chatbot.dto.AiNamespaceCreateRequest;
import com.sjpark.chatbot.dto.AiNamespaceCreateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiApiClient {

  private final WebClient aiWebClient;

  /**
   * AI 서비스 헬스 체크
   *
   * @return 헬스 체크 결과
   */
  public boolean healthCheck() {
    try {
      String response = aiWebClient.get()
          .uri("/health")
          .retrieve()
          .bodyToMono(String.class)
          .block();

      log.info("AI 서비스 헬스 체크 응답: {}", response);
      return true;
    } catch (Exception e) {
      log.error("AI 서비스 헬스체크 실패 - error: {}", e.getMessage());
      return false;
    }
  }

  /**
   * AI 서비스에 네임스페이스 생성 요청
   */
  public AiNamespaceCreateResponse createNamespace(String name) {
    log.info("AI 서비스 네임스페이스 생성 요청 - name: {}", name);

    AiNamespaceCreateRequest request = AiNamespaceCreateRequest.builder()
        .name(name)
        .build();

    try {
      return aiWebClient.post()
          .uri("/namespaces")
          .bodyValue(request)
          .retrieve()
          .bodyToMono(AiNamespaceCreateResponse.class)
          .doOnSuccess(response -> log.info("AI 서비스 네임스페이스 생성 성공 - collectionName : {}",
              response.getCollectionName()))
          .doOnError(error -> log.error("AI 서비스 네임스페이스 생성 실패 - error: {}", error.getMessage()))
          .block(); // 동기 방식 호출
    } catch (WebClientResponseException e) {
      log.error("AI API 호출 실패 - status: {}, body: {}", e.getStatusCode(),
          e.getResponseBodyAsString());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다: " + e.getResponseBodyAsString());
    } catch (Exception e) {
      log.error("AI API 호출 중 예외 발생 - error: {}", e.getMessage());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다.");
    }
  }
}