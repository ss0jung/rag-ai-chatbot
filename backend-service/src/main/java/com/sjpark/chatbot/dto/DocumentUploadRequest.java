package com.sjpark.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadRequest {

  private MultipartFile file;
  private Long namespaceId;
  private Long userId;

}
