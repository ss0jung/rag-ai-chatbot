package com.sjpark.chatbot.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiNamespaceCreateResponse {
  private String status;
  private String collectionName;
  private String message;
}
