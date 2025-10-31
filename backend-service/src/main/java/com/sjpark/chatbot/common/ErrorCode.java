package com.sjpark.chatbot.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

  // Common Errors 400
  BAD_REQUEST(HttpStatus.BAD_REQUEST, "COMM_01", "Bad Request"),
  INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMM_02", "Invalid Input Value"),
  METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMM_03", "Method Not"),

  // 인증/인가 에러
  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
  INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_002", "유효하지 않은 토큰입니다."),
  EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "만료된 토큰입니다."),
  FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH_004", "접근 권한이 없습니다."),

  // 사용자 에러
  USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_001", "사용자를 찾을 수 없습니다."),
  USER_ALREADY_EXISTS(HttpStatus.CONFLICT, "USER_002", "이미 존재하는 사용자입니다."),
  INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "USER_003", "비밀번호가 일치하지 않습니다."),

  // 네임스페이스 에러
  NAMESPACE_NOT_FOUND(HttpStatus.NOT_FOUND, "NS_001", "네임스페이스를 찾을 수 없습니다."),
  NAMESPACE_ALREADY_EXISTS(HttpStatus.CONFLICT, "NS_002", "이미 존재하는 네임스페이스입니다."),

  // 문서 에러
  DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "DOC_001", "문서를 찾을 수 없습니다."),
  DOCUMENT_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "DOC_002", "문서 업로드에 실패했습니다."),
  INVALID_FILE_FORMAT(HttpStatus.BAD_REQUEST, "DOC_003", "지원하지 않는 파일 형식입니다."),
  DUPLICATE_DOCUMENT(HttpStatus.CONFLICT, "DOC_004", "동일한 파일이 이미 업로드되어 있습니다."),

  // 대화 에러
  CONVERSATION_NOT_FOUND(HttpStatus.NOT_FOUND, "CONV_001", "대화를 찾을 수 없습니다."),
  MESSAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "MSG_001", "메시지를 찾을 수 없습니다."),

  // AI API 에러
  AI_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "AI_001", "AI API 호출 중 오류가 발생했습니다."),
  AI_API_TIMEOUT(HttpStatus.REQUEST_TIMEOUT, "AI_002", "AI API 응답 시간이 초과되었습니다."),

  // 서버 에러
  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER_001", "서버 내부 오류가 발생했습니다."),
  DATABASE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER_002", "데이터베이스 오류가 발생했습니다.");

  private final HttpStatus httpStatus;
  private final String code;
  private final String message;
}
