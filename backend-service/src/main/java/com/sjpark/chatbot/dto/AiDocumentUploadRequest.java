package com.sjpark.chatbot.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiDocumentUploadRequest {
  private String collection_name;
  private String filename;
  private String file_path;
  private Long document_id;
}

