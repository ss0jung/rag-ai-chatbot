package com.sjpark.chatbot.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiNamespaceCreateRequest {
  private String name;
}
