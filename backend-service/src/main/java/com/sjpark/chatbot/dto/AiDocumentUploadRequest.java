package com.sjpark.chatbot.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiDocumentUploadRequest {
  private String document_id;
  private String collection_name;
  private String file_path;
  private String filename;
}

