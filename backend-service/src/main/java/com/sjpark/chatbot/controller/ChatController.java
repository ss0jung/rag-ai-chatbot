package com.sjpark.chatbot.controller;


import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ChatController {

  @PostMapping("/chat")
  public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
    String message = request.get("message");

    // 여기에 실제 AI 로직 또는 Python API 호출
    String response = "Java 서버에서 처리한 응답: " + message;

    return ResponseEntity.ok(Map.of("response", response));
  }
}
