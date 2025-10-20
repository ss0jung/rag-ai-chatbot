package com.sjpark.chatbot.controller;

import com.sjpark.chatbot.common.ApiResponse;
import com.sjpark.chatbot.proxy.AiApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

  private final AiApiClient aiApiClient;

  @GetMapping
  public ApiResponse<Map<String, Object>> health() {
    Map<String, Object> status = new HashMap<>();
    status.put("status", "UP");
    status.put("service", "rag-chat-api");

    // AI 서비스 상태 체크
    boolean aiServiceHealthy = aiApiClient.healthCheck();
    status.put("aiService", aiServiceHealthy ? "UP" : "DOWN");

    return ApiResponse.success(status);
  }
}