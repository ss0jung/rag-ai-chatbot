package com.sjpark.chatbot.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@JsonInclude(Include.NON_NULL)
public class ApiResponse<T> {

  private boolean success;
  private T data;
  private ErrorInfo error;
  private LocalDateTime timestamp;


  // 성공 응답 (데이터 있음)
  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(true, data, null, LocalDateTime.now());
  }

  // 성공 응답 (데이터 없음)
  public static <T> ApiResponse<T> success() {
    return new ApiResponse<>(true, null, null, LocalDateTime.now());
  }

  // 실패 응답 (ErrorCode 사용)
  public static <T> ApiResponse<T> error(ErrorCode errorCode) {
    ErrorInfo errorInfo = new ErrorInfo(
        errorCode.getCode(),
        errorCode.getMessage(),
        null
    );
    return new ApiResponse<>(false, null, errorInfo, LocalDateTime.now());
  }

  // 실패 응답 (커스텀 메시지)
  public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMessage) {
    ErrorInfo errorInfo = new ErrorInfo(
        errorCode.getCode(),
        customMessage,
        null
    );
    return new ApiResponse<>(false, null, errorInfo, LocalDateTime.now());
  }

  // 실패 응답 (상세 정보 포함)
  public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMessage,
      Object details) {
    ErrorInfo errorInfo = new ErrorInfo(
        errorCode.getCode(),
        customMessage,
        details
    );
    return new ApiResponse<>(false, null, errorInfo, LocalDateTime.now());
  }


  @Getter
  @AllArgsConstructor
  @JsonInclude(Include.NON_NULL)
  public static class ErrorInfo {

    private String code;
    private String message;
    private Object details;
  }
}
