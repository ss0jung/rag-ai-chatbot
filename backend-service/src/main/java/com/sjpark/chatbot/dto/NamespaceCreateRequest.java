package com.sjpark.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NamespaceCreateRequest {

  @NotBlank(message = "문서 보관함 이름은 필수입니다.")
  @Size(min = 2, max = 100, message = "문서 보관함 이름은 2자 이상 100자 이하로 입력해주세요.")
  private String name;

  @NotNull(message = "사용자 정보는 필수입니다.")
  private Long userId;

  @Size(max = 1000, message = "설명은 최대 1000자까지 입력할 수 있습니다.")
  private String description;
}
