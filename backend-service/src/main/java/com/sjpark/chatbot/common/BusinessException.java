package com.sjpark.chatbot.common;

import lombok.Getter;

/**
 * 비즈니스 로직 처리 중 발생하는 커스텀 예외
 * */
@Getter
public class BusinessException extends RuntimeException{
  private final ErrorCode errorCode;

  public BusinessException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
  }

  public BusinessException(ErrorCode errorCode, String message) {
    super(message);
    this.errorCode = errorCode;
  }

  public BusinessException(ErrorCode errorCode, String message, Throwable cause) {
    super(message, cause);
    this.errorCode = errorCode;
  }
}
