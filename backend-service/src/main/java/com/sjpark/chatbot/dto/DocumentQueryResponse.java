package com.sjpark.chatbot.dto;

import com.sjpark.chatbot.domain.Document;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DocumentQueryResponse {
  private Long id;
  private String name;
  private String type;
  private Long size;
  private LocalDateTime uploadedAt;
  private Long vaultId;

  public static DocumentQueryResponse from(Document document){
    return DocumentQueryResponse.builder()
        .id(document.getId())
        .name(document.getFilename())
        .type(document.getFileType())
        .size(document.getFileSize())
        .uploadedAt(document.getCreatedAt())
        .vaultId(document.getNamespace().getId())
        .build();
  }
}
