package com.sjpark.chatbot.controller;

import com.sjpark.chatbot.common.ApiResponse;
import com.sjpark.chatbot.dto.NamespaceCreateRequest;
import com.sjpark.chatbot.dto.NamespaceResponse;
import com.sjpark.chatbot.service.NamespaceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/ai/namespaces")
@RequiredArgsConstructor
public class NamespaceController {

  private final NamespaceService namespaceService;

  /**
   * 네임스페이스 목록 조회
   */
  @GetMapping
  public ApiResponse<List<NamespaceResponse>> list(@RequestParam Long userId) {
    log.info("네임스페이스 목록 조회 요청 - 사용자 ID: {}", userId);

    List<NamespaceResponse> namespaces = namespaceService.getNamespacesByUserId(userId).stream()
        .map(NamespaceResponse::from).collect(Collectors.toList());

    return ApiResponse.success(namespaces);
  }

  /**
   * 네임스페이스 생성
   */
  @PostMapping
  public ApiResponse<NamespaceResponse> create(@RequestBody @Valid NamespaceCreateRequest request) {
    log.info("네임스페이스 생성 요청 - 사용자 ID: {}, 네임스페이스 이름: {}", request.getUserId(), request.getName());

    // 1. DB에 네임스페이스 저장 + AI 서비스에 네임스페이스 생성 요청
    NamespaceResponse response = namespaceService.createNamespaceWithAi(request);
    log.info("네임스페이스 생성 완료 - 네임스페이스 ID: {}", response.getId());

    return ApiResponse.success(response);
  }


}
