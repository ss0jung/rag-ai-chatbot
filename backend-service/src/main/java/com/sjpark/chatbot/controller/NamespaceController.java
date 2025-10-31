package com.sjpark.chatbot.controller;

import com.sjpark.chatbot.common.ApiResponse;
import com.sjpark.chatbot.dto.DocumentQueryResponse;
import com.sjpark.chatbot.dto.DocumentUploadRequest;
import com.sjpark.chatbot.dto.DocumentUploadResponse;
import com.sjpark.chatbot.dto.NamespaceCreateRequest;
import com.sjpark.chatbot.dto.NamespaceResponse;
import com.sjpark.chatbot.dto.NamespaceWithTotalCnt;
import com.sjpark.chatbot.service.DocumentService;
import com.sjpark.chatbot.service.NamespaceService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/namespaces")
@RequiredArgsConstructor
public class NamespaceController {

  private final NamespaceService namespaceService;
  private final DocumentService documentService;

  /**
   * 사용자의 네임스페이스 목록 조회 GET /api/v1/namespaces?userId={userId}
   * <p>
   * TODO: JWT 인증 구현 후 userId 파라미터 제거하고 SecurityContext에서 추출
   */
  @GetMapping
  public ApiResponse<List<NamespaceWithTotalCnt>> list(@RequestParam Long userId) {
    log.info("네임스페이스 목록 조회 요청 - 사용자 ID: {}", userId);

    List<NamespaceWithTotalCnt> namespaces = namespaceService.getNamespacesByUserId(userId);
    return ApiResponse.success(namespaces);
  }

  /**
   * 사용자의 네임스페이스 생성 POST /api/v1/namespaces
   * <p>
   * TODO: JWT 인증 구현 후 request에서 userId 제거하고 SecurityContext에서 추출
   */
  @PostMapping
  public ApiResponse<NamespaceResponse> create(@RequestBody @Valid NamespaceCreateRequest request) {
    log.info("네임스페이스 생성 요청 - 사용자 ID: {}, 네임스페이스 이름: {}", request.getUserId(), request.getName());

    // 1. DB에 네임스페이스 저장 + AI 서비스에 네임스페이스 생성 요청
    NamespaceResponse response = namespaceService.createNamespaceWithAi(request);
    log.info("네임스페이스 생성 완료 - 네임스페이스 ID: {}", response.getId());

    return ApiResponse.success(response);
  }

  /**
   * 사용자의 네임스페이스 및 하위 문서 일괄 삭제 DELETE /api/v1/namespaces/{namespaceId}?userId={userId}
   * <p>
   * TODO: JWT 인증 구현 후 userId 파라미터 제거하고 SecurityContext에서 추출
   */
  @DeleteMapping("/{namespaceId}")
  public ApiResponse<Object> delete(
      @PathVariable Long namespaceId,
      @RequestParam Long userId) {
    log.info("네임스페이스 삭제 요청 - userId: {}, namespaceId: {}", userId, namespaceId);

    // 1. DB에서 네임스페이스 및 하위 문서 삭제 + AI 서비스에 네임스페이스 삭제 요청
    namespaceService.deleteNamespace(userId, namespaceId);
    log.info("네임스페이스 삭제 완료 - namespaceId: {}", namespaceId);

    return ApiResponse.success();
  }

  /**
   * 네임스페이스에 업로드된 문서 목록 조회 GET /api/v1/namespaces/{namespaceId}/documents?userId={userId}
   * <p>
   * TODO: JWT 인증 구현 후 userId 파라미터 제거하고 SecurityContext에서 추출
   */
  @GetMapping("/{namespaceId}/documents")
  public ApiResponse<List<DocumentQueryResponse>> getDocuments(
      @PathVariable Long namespaceId,
      @RequestParam Long userId) {

    log.info("문서 목록 조회 요청 - namespaceId: {}, userId: {}", namespaceId, userId);
    List<DocumentQueryResponse> documents = documentService.getDocumentsByUserIdAndNamespaceId(userId, namespaceId);

    return ApiResponse.success(documents);
  }

  /**
   * 네임스페이스에 문서 업로드 POST /api/v1/namespaces/{namespaceId}/documents
   * <p>
   * TODO: JWT 인증 구현 후 request에서 userId 제거하고 SecurityContext에서 추출
   */
  @PostMapping(value = "/{namespaceId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<DocumentUploadResponse> uploadDocument(
      @PathVariable Long namespaceId,
      @ModelAttribute DocumentUploadRequest request) {

    // PathVariable의 namespaceId와 request의 namespaceId가 일치하는지 검증
    if (!namespaceId.equals(request.getNamespaceId())) {
      log.warn("namespace ID 불일치 - Path: {}, Request: {}", namespaceId, request.getNamespaceId());
      request.setNamespaceId(namespaceId); // Path의 namespaceId를 우선 사용
    }

    log.info("네임스페이스에 문서 업로드 요청 - 파일명: {}, 네임스페이스 ID: {}, 사용자 ID: {}", request.getFile().getOriginalFilename(), namespaceId, request.getUserId());

    DocumentUploadResponse response = documentService.uploadDocument(request);

    log.info("문서 업로드 완료 - 문서 ID: {}", response.getId());
    return ApiResponse.success(response);
  }

}
