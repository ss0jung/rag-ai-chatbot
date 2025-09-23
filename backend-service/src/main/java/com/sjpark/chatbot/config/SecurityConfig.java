package com.sjpark.chatbot.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable()) // CSRF 비활성화
        .authorizeHttpRequests(auth -> {
          auth.requestMatchers("/api/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll(); // 특정 경로 허용
          auth.anyRequest().permitAll(); // 나머지 요청도 허용
        });
    return http.build();
  }
}