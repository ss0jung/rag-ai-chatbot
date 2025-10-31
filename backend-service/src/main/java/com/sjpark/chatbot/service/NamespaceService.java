package com.sjpark.chatbot.service;

import com.sjpark.chatbot.domain.Namespace;
import com.sjpark.chatbot.domain.User;
import com.sjpark.chatbot.dto.AiNamespaceCreateResponse;
import com.sjpark.chatbot.dto.NamespaceCreateRequest;
import com.sjpark.chatbot.dto.NamespaceResponse;
import com.sjpark.chatbot.dto.NamespaceWithTotalCnt;
import com.sjpark.chatbot.proxy.AiApiClient;
import com.sjpark.chatbot.repo.NamespaceRepository;
import com.sjpark.chatbot.repo.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NamespaceService {

  private final NamespaceRepository namespaceRepository;
  private final UserRepository userRepository;
  private final AiApiClient aiApiClient;

  /**
   * 사용자별 문서 보관함 목록 조회 (문서 개수 포함)
   */
  public List<NamespaceWithTotalCnt> getNamespacesByUserId(Long userId) {
    // 1. 사용자 조회
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

    return namespaceRepository.findByUserWithDocumentTotalCnt(user);
  }

  /**
   * 네임스페이스 생성 + AI 서비스 연동
   */
  @Transactional
  public NamespaceResponse createNamespaceWithAi(NamespaceCreateRequest request) {
    // 1. 사용자 및 네임스페이스 이름 중복 확인
    User user = userRepository.findById(request.getUserId())
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

    if (namespaceRepository.existsByUserAndName(user, request.getName())) {
      throw new IllegalArgumentException("동일한 이름의 문서 보관함이 존재합니다.");
    }

    // 2. AI 서비스 ChromaDB 네임스페이스 생성 요청
    // AI 서비스용 네임스페이스 이름 생성 (사용자ID__네임스페이스이름)
    AiNamespaceCreateResponse response;
    String chromaDBCollectionName = request.getUserId() + "__" + request.getName();

    try {
      response = aiApiClient.createNamespace(chromaDBCollectionName);
    } catch (Exception e) {
      throw new RuntimeException("Failed to create namespace: " + e.getMessage(), e);
    }
    log.info("ChromaDB 컬렉션 생성 완료 - collectionName: {}", response.getCollectionName());

    // 3. DB에 네임스페이스 저장
    Namespace namespace = Namespace.builder()
        .name(request.getName())
        .user(user)
        .chromaCollectionName(chromaDBCollectionName)
        .description(request.getDescription())
        .build();

    Namespace saved = namespaceRepository.save(namespace);
    log.info("Namespace 생성 완료 - id: {}, name: {}", saved.getId(), saved.getName());

    return NamespaceResponse.from(saved);
  }


  /**
   * 네임스페이스 삭제
   */
  @Transactional
  public void deleteNamespace(Long userId, Long namespaceId) {
    // 1. 네임스페이스 존재 확인
    Namespace namespace = namespaceRepository.findById(namespaceId)
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문서 보관함입니다."));
    // 2. 소유자 권한 확인
    if (!namespace.getUser().getId().equals(userId)) {
      throw new IllegalArgumentException("문서 보관함 삭제 권한이 없습니다.");
    }

    // 3. AI 서비스에서 ChromaDB 컬렉션 삭제
    try {
      aiApiClient.deleteNamespace(namespace.getChromaCollectionName());
      log.info("ChromaDB 컬렉션 삭제 완료 - collectionName: {}", namespace.getChromaCollectionName());
    } catch (Exception e) {
      log.warn("AI namespace 삭제 실패 - collectionName: {}, error: {}",
          namespace.getChromaCollectionName(), e.getMessage());
      // ChromaDB 삭제 실패해도 DB는 삭제 진행 (일관성 유지)
    }

    // 4. DB에서 네임스페이스 삭제 (연관된 문서들도 함께 삭제됨)
    namespaceRepository.deleteById(namespace.getId());
    log.info("Namespace 삭제 완료 - id: {}, name: {}", namespace.getId(), namespace.getName());
  }
}
