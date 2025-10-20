package com.sjpark.chatbot.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

@Slf4j
@Component
public class LoggingFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain)
      throws ServletException, IOException {

    // Request/Response를 여러 번 읽을 수 있도록 래핑
    ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request);
    ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

    long startTime = System.currentTimeMillis();

    try {
      // 요청 로깅
      logRequest(wrappedRequest);

      // 다음 필터 체인 실행
      filterChain.doFilter(wrappedRequest, wrappedResponse);

    } finally {
      long duration = System.currentTimeMillis() - startTime;

      // 응답 로깅
      logResponse(wrappedRequest, wrappedResponse, duration);

      // 실제 응답으로 복사 (중요!)
      wrappedResponse.copyBodyToResponse();
    }
  }

  private void logRequest(ContentCachingRequestWrapper request) {
    String uri = request.getRequestURI();
    String method = request.getMethod();
    String queryString = request.getQueryString();
    String clientIp = getClientIp(request);

    log.info("[REQUEST] {} {} | IP: {} | Query: {}",
        method, uri, clientIp, queryString != null ? queryString : "");

    // Body 로깅 (POST, PUT 등)
    if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
      byte[] content = request.getContentAsByteArray();
      if (content.length > 0) {
        String body = new String(content, StandardCharsets.UTF_8);
        log.debug("[REQUEST BODY] {}",
            body.length() > 1000 ? body.substring(0, 1000) + "..." : body);
      }
    }
  }

  private void logResponse(ContentCachingRequestWrapper request,
      ContentCachingResponseWrapper response, long duration) {
    int status = response.getStatus();
    String method = request.getMethod();
    String uri = request.getRequestURI();

    log.info("[RESPONSE] {} {} | Status: {} | Duration: {}ms",
        method, uri, status, duration);

    // 응답 Body 로깅 (디버그 레벨)
    byte[] content = response.getContentAsByteArray();
    if (content.length > 0) {
      String body = new String(content, StandardCharsets.UTF_8);
      log.debug("[RESPONSE BODY] {}",
          body.length() > 1000 ? body.substring(0, 1000) + "..." : body);
    }
  }

  private String getClientIp(HttpServletRequest request) {
    String ip = request.getHeader("X-Forwarded-For");
    if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
      ip = request.getHeader("Proxy-Client-IP");
    }
    if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
      ip = request.getHeader("WL-Proxy-Client-IP");
    }
    if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
      ip = request.getRemoteAddr();
    }
    return ip;
  }
}