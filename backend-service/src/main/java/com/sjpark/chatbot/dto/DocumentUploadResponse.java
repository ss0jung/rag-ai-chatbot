package com.sjpark.chatbot.dto;

import com.sjpark.chatbot.domain.Document;
import com.sjpark.chatbot.domain.Document.DocumentStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DocumentUploadResponse {
  private Long id;
  private Long namespaceId;
  private String namespaceName;
  private String fileName;
  private String fileType;
  private Long fileSize;
  private DocumentStatus status;
  private String errorMessage;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static DocumentUploadResponse from(Document document) {
    return DocumentUploadResponse.builder()
        .id(document.getId())
        .namespaceId(document.getNamespace().getId())
        .namespaceName(document.getNamespace().getName())
        .fileName(document.getFilename())
        .fileType(document.getFileType())
        .fileSize(document.getFileSize())
        .status(document.getStatus())
        .errorMessage(document.getErrorMessage())
        .createdAt(document.getCreatedAt())
        .updatedAt(document.getUpdatedAt())
        .build();
  }

}
