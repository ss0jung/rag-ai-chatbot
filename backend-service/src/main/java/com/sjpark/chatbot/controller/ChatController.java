package com.sjpark.chatbot.controller;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.sjpark.chatbot.dto.ApiResponse;
import com.sjpark.chatbot.dto.PreprocessRequest;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/backend-api")
public class ChatController {

  @Value("${app.ai.base-url}")
  private String aiBaseUrl;

  @Value("${app.file.upload-dir}")
  private String uploadDir;

  private final RestClient restClient;
  public ChatController(RestClient restClient) {
    this.restClient = restClient;
  }

  private static final Logger logger = LoggerFactory.getLogger(
      ChatController.class
  );

  @PostMapping("/rag/query")
  public ResponseEntity<Map<String, String>> ragQuery(@RequestBody Map<String, String> requestBody) {
    try {
      String question = requestBody.get("question");
      if (question == null || question.trim().isEmpty()) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", "질문이 비어있습니다."));
      }

      RestTemplate restTemplate = new RestTemplate();

      // URL 인코딩 처리
      String encodedQuestion = URLEncoder.encode(question, StandardCharsets.UTF_8);
      String pythonApiUrl = aiBaseUrl + "/api/rag/query?query=" + question;

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

  @PostMapping(value = "/files/uploads", produces = "application/json")
  public ResponseEntity<ApiResponse<Void>> handleFilesUpload(@RequestParam("files") MultipartFile[] files) {
      try {
          if (files == null || files.length == 0) {
              return ResponseEntity.badRequest()
                  .body(new ApiResponse<>(false, 400, "No files uploaded", null));
          }
          ObjectMapper objectMapper = new ObjectMapper();
          for (MultipartFile file : files) {
              if (file.isEmpty()) {
                  return ResponseEntity.badRequest()
                      .body(new ApiResponse<>(false, 400, "One of the files is empty", null));
              }


              String filePath = uploadDir + "/" + file.getOriginalFilename();
              String url = aiBaseUrl + "/ai-api/files/preprocess";
              logger.info("URL : {}", url);
              logger.info("Saving file to: {}", filePath);
              file.transferTo(new java.io.File(filePath));

              PreprocessRequest preprocessRequest = new PreprocessRequest(filePath);
              String jsonRequest = objectMapper.writeValueAsString(preprocessRequest);
              logger.info("Preprocess Request JSON: {}", jsonRequest);

              try {
                ResponseEntity<Map> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(preprocessRequest)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        (request, resp) -> {
                          String errorBody = new String(resp.getBody().readAllBytes());
                          logger.error("AI API Error - Status: {}, Body: {}",
                              resp.getStatusCode(), errorBody);
                          throw new RuntimeException("AI API returned error: " + errorBody);
                        })
                    .toEntity(Map.class);
                logger.info("AI API Response: {}", response.getBody());

              } catch (Exception aiError) {
                logger.error("AI API 호출 실패 for file: {}", file.getOriginalFilename(), aiError);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, 500,
                        "AI API 호출 실패: " + aiError.getMessage(), null));
              }
          }

        // 모든 파일 성공 시
        return ResponseEntity.ok(
            new ApiResponse<>(true, 200, "All files uploaded and processed successfully", null)
        );

      } catch (IOException ioError) {
        logger.error("파일 저장 중 오류", ioError);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiResponse<>(false, 500, "파일 저장 실패", null));

      } catch (Exception e) {
        logger.error("파일 업로드 처리 중 예외 발생", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiResponse<>(false, 500, "시스템 오류가 발생하였습니다", null));
      }
  }
}
