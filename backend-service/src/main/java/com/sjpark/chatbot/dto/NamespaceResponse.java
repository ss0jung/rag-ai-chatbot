package com.sjpark.chatbot.dto;

import com.sjpark.chatbot.domain.Namespace;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NamespaceResponse {
  private Long id;
  private String name;
  private String description;
  private LocalDateTime createdAt;

  public static NamespaceResponse from(Namespace namespace) {
    return NamespaceResponse.builder()
        .id(namespace.getId())
        .name(namespace.getName())
        .description(namespace.getDescription())
        .createdAt(namespace.getCreatedAt())
        .build();
  }
}
