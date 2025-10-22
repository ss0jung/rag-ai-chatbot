package com.sjpark.chatbot.service;

import com.sjpark.chatbot.domain.Namespace;
import com.sjpark.chatbot.domain.User;
import com.sjpark.chatbot.dto.AiNamespaceCreateResponse;
import com.sjpark.chatbot.dto.NamespaceCreateRequest;
import com.sjpark.chatbot.dto.NamespaceResponse;
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
   * 사용자별 네임스페이스 전체 목록 조회
   */
  public List<Namespace> getNamespacesByUserId(Long userId) {

    User user = userRepository.findById(userId)
        .orElseThrow(()-> new IllegalArgumentException("존재하지 않는 사용자입니다."));

    return namespaceRepository.findByUser(user);
  }

  /**
   * 네임스페이스 생성 + AI 서비스 연동
   */
  @Transactional
  public NamespaceResponse createNamespaceWithAi(NamespaceCreateRequest request) {
    log.info("네임스페이스 생성 요청 - userId: {}, namespaceName: {}", request.getUserId(), request.getName());

    // 1. 네임스페이스 중복 체크
    User user = userRepository.findById(request.getUserId())
        .orElseThrow(()-> new IllegalArgumentException("존재하지 않는 사용자입니다."));

    if (namespaceRepository.existsByUserAndName(user, request.getName())) {
      throw new IllegalArgumentException("동일한 이름의 문서 보관함이 존재합니다.");
    }

    // 2. AI 서비스 Chroma 네임스페이스 생성 요청
    AiNamespaceCreateResponse response;

    try {
      response = aiApiClient.createNamespace(request.getName());
    } catch (Exception e) {
      throw new RuntimeException("Failed to create namespace: " + e.getMessage(), e);
    }
    log.info("ChromaDB 컬렉션 생성 완료 - collectionName: {}", response.getCollectionName());

    // 3. DB에 네임스페이스 저장
    Namespace namespace = Namespace.builder()
        .name(request.getName())
        .user(user)
        .build();

    Namespace saved = namespaceRepository.save(namespace);
    log.info("Namespace 생성 완료 - id: {}, name: {}", saved.getId(), saved.getName());

    return NamespaceResponse.from(saved);
  }

  /**
   * 네임스페이스 조회
   */
  public NamespaceResponse getNamespaceById(User user, Long namespaceId) {
    Namespace namespace = namespaceRepository.findById(namespaceId)
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 네임스페이스입니다."));

    // 권한 체크
//    if(!namespace.getUser().getId().equals(user.getId())){
//      throw new IllegalArgumentException("권한이 없는 네임스페이스입니다.");
//    }

    return NamespaceResponse.from(namespace);
  }

  /**
   * 네임스페이스 삭제
   */
  @Transactional
  public void deleteNamespace(User user, Long namespaceId) {
    Namespace namespace = namespaceRepository.findById(namespaceId)
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 네임스페이스입니다."));

    // TODO: AI 서비스에 ChromaDB 컬렉션 삭제 요청 추가

    namespaceRepository.delete(namespace);
  }
}
