package com.sjpark.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDocumentUploadResponse {
  private String status;
  private Long documentId;
  private String message;
  private Integer chunkCount;
}
