package com.sjpark.chatbot.common.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        // CSRF 비활성화 (JWT 사용 시)
        .csrf(AbstractHttpConfigurer::disable)

        // CORS 설정
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))

        // 세션 사용 안 함 (Stateless)
        .sessionManagement(session ->
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        )

        // URL별 권한 설정
        .authorizeHttpRequests(auth -> auth
            // 인증 없이 접근 가능한 경로
            .requestMatchers("/health", "/actuator/**").permitAll()
            .requestMatchers("/auth/**").permitAll()
            .requestMatchers("/error").permitAll()
            // Swagger 관련 경로 허용
            .requestMatchers("/swagger-ui/**", "/api-docs/**").permitAll()
            // 나머지는 인증 필요 (4단계에서 JWT 필터 추가 예정)
            .anyRequest().permitAll() // 임시로 모두 허용 (4단계에서 authenticated()로 변경)
        )

        // HTTP Basic 비활성화
        .httpBasic(AbstractHttpConfigurer::disable)

        // Form 로그인 비활성화
        .formLogin(AbstractHttpConfigurer::disable);

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // 허용할 Origin 설정
    configuration.setAllowedOrigins(Arrays.asList(
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ));

    // 허용할 HTTP 메서드
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

    // 허용할 헤더
    configuration.setAllowedHeaders(List.of("*"));

    // 인증 정보 허용
    configuration.setAllowCredentials(true);

    // 노출할 헤더
    configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));

    // Preflight 요청 캐시 시간 (초)
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);

    return source;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}