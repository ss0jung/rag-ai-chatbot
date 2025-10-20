package com.sjpark.chatbot.common.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Python AI 서비스 호출용
 * */

@Configuration
public class WebClientConfig {
  @Value("${ai.service.url:http://localhost:8001}")
  private String aiServiceUrl;

  @Value("${ai.service.timeout:30000}")
  private int timeout;

  @Bean
  public WebClient aiWebClient() {
    HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, timeout)
        .responseTimeout(Duration.ofMillis(timeout))
        .doOnConnected(conn ->
            conn.addHandlerLast(new ReadTimeoutHandler(timeout, TimeUnit.MILLISECONDS))
                .addHandlerLast(new WriteTimeoutHandler(timeout, TimeUnit.MILLISECONDS)));

    return WebClient.builder()
        .baseUrl(aiServiceUrl)
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .filter(logRequest())
        .filter(logResponse())
        .filter(handleError())
        .build();
  }

  private ExchangeFilterFunction logRequest() {
    return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
      System.out.println("AI API Request: " + clientRequest.method() + " " + clientRequest.url());
      return Mono.just(clientRequest);
    });
  }

  private ExchangeFilterFunction logResponse() {
    return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
      System.out.println("AI API Response: " + clientResponse.statusCode());
      return Mono.just(clientResponse);
    });
  }

  private ExchangeFilterFunction handleError() {
    return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
      if (clientResponse.statusCode().isError()) {
        return clientResponse.bodyToMono(String.class)
            .flatMap(errorBody -> {
              System.err.println("AI API Error: " + errorBody);
              return Mono.just(clientResponse);
            });
      }
      return Mono.just(clientResponse);
    });
  }
}
