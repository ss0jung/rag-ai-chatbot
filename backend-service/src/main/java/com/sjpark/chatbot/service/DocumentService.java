package com.sjpark.chatbot.service;

import com.sjpark.chatbot.common.BusinessException;
import com.sjpark.chatbot.common.ErrorCode;
import com.sjpark.chatbot.domain.Document;
import com.sjpark.chatbot.domain.Document.DocumentStatus;
import com.sjpark.chatbot.domain.Namespace;
import com.sjpark.chatbot.domain.User;
import com.sjpark.chatbot.dto.AiDocumentUploadResponse;
import com.sjpark.chatbot.dto.DocumentQueryResponse;
import com.sjpark.chatbot.dto.DocumentUploadRequest;
import com.sjpark.chatbot.dto.DocumentUploadResponse;
import com.sjpark.chatbot.proxy.AiApiClient;
import com.sjpark.chatbot.repo.DocumentRepository;
import com.sjpark.chatbot.repo.NamespaceRepository;
import com.sjpark.chatbot.repo.UserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {

  private final DocumentRepository documentRepository;
  private final NamespaceRepository namespaceRepository;
  private final UserRepository userRepository;
  private final AiApiClient aiApiClient;

  @Value("${file.upload.dir}")
  private String uploadDir;

  private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * 문서 목록 조회
   */
  public List<DocumentQueryResponse> getDocumentsByUserIdAndNamespaceId(Long userId, Long namespaceId) {
    List<Document> documents = documentRepository.findByUserIdAndNamespaceId(userId, namespaceId);
    log.info("문서 조회 완료 - userId: {}, namespaceId: {}}", userId, namespaceId);
    return documents.stream().map(DocumentQueryResponse::from).toList();
  }

  /**
   * 문서 업로드 및 AI 서비스에 전송
   */
  @Transactional
  public DocumentUploadResponse uploadDocument(DocumentUploadRequest request) {
    MultipartFile file = request.getFile();

    // 1. 파일 검증
    validateFile(file);

    // 2. 사용자 및 네임스페이스 조회
    User user = userRepository.findById(request.getUserId())
        .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

    Namespace namespace = namespaceRepository.findByUser(user).stream()
        .filter(ns -> ns.getId().equals(request.getNamespaceId()))
        .findFirst()
        .orElseThrow(() -> new BusinessException(ErrorCode.NAMESPACE_NOT_FOUND));

    // 3. 파일 중복 검사
    String fileHash = calculateFileHash(file);
    if (documentRepository.existsByFileHashAndNamespaceId(fileHash, namespace.getId())) {
      throw new BusinessException(ErrorCode.DUPLICATE_DOCUMENT, "동일한 파일이 이미 업로드되어 있습니다.");
    }

    // 4. 파일 저장
    String savedFilePath = saveFile(file, user.getId(), namespace.getId());
    log.info("파일 저장 완료 - 경로 :{}", savedFilePath);

    // 파일 확장자
    String extension = "";
    if (file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
      extension = file.getOriginalFilename()
          .substring(file.getOriginalFilename().lastIndexOf(".") + 1).toLowerCase();
    }

    // 5. DB에 문서 메타데이터 저장
    Document document = Document.builder()
        .namespace(namespace)
        .user(user)
        .filename(file.getOriginalFilename())
        .filePath(savedFilePath)
        .fileType(extension)
        .fileSize(file.getSize())
        .status(DocumentStatus.PENDING)
        .build();

    Document savedDocument = documentRepository.save(document);
    log.info("문서 메타데이터 저장 완료 - ID: {}", savedDocument.getId());

    // 6. AI 서비스에 문서 업로드 요청
    try {

      // 상태를 PROCESSING으로 변경
      savedDocument.updateStatus(DocumentStatus.PROCESSING);
      documentRepository.save(savedDocument);

      // AI 서비스 호출 (chromaCollectionName 사용)
      AiDocumentUploadResponse aiResponse = aiApiClient.indexDocument(
          savedDocument.getId(),
          namespace,
          savedFilePath,
          file.getOriginalFilename()
      );

      log.info("AI 서비스 문서 처리 요청 완료 - documentId: {}, chromaCollectionName: {}, status: {}",
          savedDocument.getId(), namespace.getChromaCollectionName(), aiResponse.getStatus());

    } catch (Exception e) {
      log.error("AI 서비스 호출 실패 - documentId: {}, error: {}",
          savedDocument.getId(), e.getMessage());
      savedDocument.updateError("AI 서비스 처리 실패: " + e.getMessage());
      documentRepository.save(savedDocument);
      throw new BusinessException(ErrorCode.DOCUMENT_UPLOAD_FAILED,
          "문서 처리 중 오류가 발생했습니다.", e);
    }

    return DocumentUploadResponse.from(savedDocument);
  }

  /**
   * 파일 검증
   */
  private void validateFile(MultipartFile file) {
    // 파일이 비어있는지 확인
    if (file.isEmpty()) {
      throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "파일이 비어있습니다.");
    }

    // 파일 크기 확인
    if (file.getSize() > MAX_FILE_SIZE) {
      throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "파일 크기는 10MB를 초과할 수 없습니다.");
    }

    // 파일 확장자
    String filename = file.getOriginalFilename();
    if (filename == null || !hasValidExtension(filename)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "지원하지 않는 파일 형식입니다.(PDF만 가능)");
    }
  }

  /**
   * 파일 확장자 검증
   */
  private boolean hasValidExtension(String filename) {
    String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    return extension.equals("pdf");
  }

  /**
   * 파일 hash 값 계산
   */
  private String calculateFileHash(MultipartFile file) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] fileBytes = file.getBytes();
      byte[] hashBytes = digest.digest(fileBytes);

      StringBuilder sb = new StringBuilder();
      for (byte b : hashBytes) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();

    } catch (Exception e) {
      log.error("파일 해시 계산 실패 - filename: {}, error: {}", file.getOriginalFilename(),
          e.getMessage());
      throw new BusinessException(ErrorCode.DOCUMENT_UPLOAD_FAILED, "파일 해시 계산 중 오류가 발생했습니다", e);
    }
  }

  /**
   * 파일 저장
   *
   * @ 파일 저장 위치 : ./shared/user_{userId}/namespace_{namespaceId}/
   */
  private String saveFile(MultipartFile file, Long userId, Long namespaceId) {
    try {
      // 업로드 디렉토리 생성
      Path uploadPath = Path.of(Paths.get(uploadDir) + "/user_" + userId.toString() + "/namespace_"
          + namespaceId.toString());
      log.info("uploadPath : {}:", uploadPath.toString());

      if (!Files.exists(uploadPath)) {
        Files.createDirectories(uploadPath);
      }
/*

      // 고유 파일명 생성 (타임스탬프 + UUID)
      String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
      String uniqueFilename = timestamp + "_" + UUID.randomUUID().toString().substring(0, 4) + "_"
          + file.getOriginalFilename();
*/

      // 파일 저장
      Path filePath = uploadPath.resolve(file.getOriginalFilename());
      Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

      return filePath.toString();

    } catch (IOException e) {
      log.error("파일 저장 실패 - filename: {}, error: {}", file.getOriginalFilename(), e.getMessage());
      throw new BusinessException(ErrorCode.DOCUMENT_UPLOAD_FAILED, "파일 저장 중 오류가 발생했습니다", e);
    }

  }
}
