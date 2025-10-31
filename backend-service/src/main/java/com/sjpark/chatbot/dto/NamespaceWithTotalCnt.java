package com.sjpark.chatbot.dto;

import com.sjpark.chatbot.domain.Namespace;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class NamespaceWithTotalCnt {
  private Namespace namespace;
  private Long documentTotalCnt;

  public static NamespaceWithTotalCnt from(Namespace namespace, Long documentTotalCnt) {
    return NamespaceWithTotalCnt.builder()
        .namespace(namespace)
        .documentTotalCnt(documentTotalCnt)
        .build();
  }
}
