package com.sjpark.chatbot.proxy;


import com.sjpark.chatbot.dto.AiDocumentUploadRequest;
import com.sjpark.chatbot.dto.AiDocumentUploadResponse;
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
      log.error("AI 서비스 네임스페이스 생성 API 호출 실패 - status: {}, body: {}", e.getStatusCode(),
          e.getResponseBodyAsString());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다: " + e.getResponseBodyAsString());
    } catch (Exception e) {
      log.error("AI 서비스 네임스페이스 생성 API 호출 중 예외 발생 - error: {}", e.getMessage());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다.");
    }
  }

  /**
   * AI 서비스에 네임스페이스 삭제 요청
   */
  public void deleteNamespace(String chromaCollectionName) {
    log.info("AI 서비스 네임스페이스 삭제 요청 - chromaCollectionName: {}", chromaCollectionName);

    try {
      aiWebClient.delete()
          .uri("/namespaces/{name}", chromaCollectionName)
          .retrieve()
          .bodyToMono(Void.class)
          .doOnSuccess(response -> log.info("AI 서비스 네임스페이스 삭제 성공 - chromaCollectionName: {}",
              chromaCollectionName))
          .doOnError(error -> log.error("AI 서비스 네임스페이스 삭제 실패 - chromaCollectionName: {}, error: {}",
              chromaCollectionName, error.getMessage()))
          .block(); // 동기 방식 호출
    } catch (WebClientResponseException e) {
      log.error("AI 서비스 네임스페이스 삭제 API 호출 실패 - status: {}, body: {}", e.getStatusCode(),
          e.getResponseBodyAsString());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다: " + e.getResponseBodyAsString());
    } catch (Exception e) {
      log.error("AI 서비스 네임스페이스 삭제 API 호출 중 예외 발생 - error: {}", e.getMessage());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다.");
    }
  }

  /**
   * AI 서비스에 문서 전처리 요청 (로드/청킹/임베딩/vectorDB 저장)
   */
  public AiDocumentUploadResponse preprocessDocument(Long documentId, String namespaceName, String filePath, String filename) {
    log.info("AI 서비스 문서 전처리 요청 - documentId: {}, namespace: {}, filename: {}, filePath: {}",
        documentId, namespaceName, filename, filePath);

    AiDocumentUploadRequest request = AiDocumentUploadRequest.builder()
        .document_id(documentId)
        .collection_name(namespaceName)
        .file_path(filePath)
        .filename(filename)
        .build();

    try {
      return aiWebClient.post()
          .uri("/namespaces/{namespaceId}/documents", namespaceName)
          .bodyValue(request)
          .retrieve()
          .bodyToMono(AiDocumentUploadResponse.class)
          .doOnSuccess(response -> log.info("AI 서비스 문서 전처리 요청 성공 - documentId : {}, status : {}",
              documentId, response.getStatus()))
          .doOnError(error -> log.error("AI 서비스 문서 전처리 요청 실패 - documentId : {}, error: {}",
              documentId, error.getMessage()))
          .block(); // 동기 방식 호출
    } catch (WebClientResponseException e) {
      log.error("AI API 호출 실패 - status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다: " + e.getResponseBodyAsString());
    } catch (Exception e) {
      log.error("AI API 호출 중 예외 발생 - error: {}", e.getMessage());
      throw new RuntimeException("AI 서비스와 통신 중 오류가 발생하였습니다.");
    }
  }
}