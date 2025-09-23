package com.sjpark.chatbot.controller;


import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

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

  @PostMapping("/rag")
  public ResponseEntity<Map<String, String>> ragQuery(@RequestBody Map<String, String> requestBody) {
    try {
      String question = requestBody.get("question");
      if (question == null || question.trim().isEmpty()) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", "질문이 비어있습니다."));
      }

      RestTemplate restTemplate = new RestTemplate();

      // URL 인코딩 처리
//      String encodedQuestion = URLEncoder.encode(question, StandardCharsets.UTF_8);
      String pythonApiUrl = "http://127.0.0.1:8000/api/rag/query?query=" + question;

      // JSON 응답을 Map으로 받기
      ResponseEntity<Map> response = restTemplate.getForEntity(pythonApiUrl, Map.class);

      if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
        Map<String, Object> responseBody = response.getBody();
        String answer = (String) responseBody.get("answer");
        return ResponseEntity.ok(Map.of("answer", answer != null ? answer : "답변을 받을 수 없습니다."));
      } else {
        return ResponseEntity.status(response.getStatusCode())
            .body(Map.of("error", "Python API 호출 실패"));
      }

    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Map.of("error", "서버 오류: " + e.getMessage()));
    }
  }
}
