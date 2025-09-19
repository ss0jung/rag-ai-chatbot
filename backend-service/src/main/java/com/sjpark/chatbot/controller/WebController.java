package com.sjpark.chatbot.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class WebController {
  // React Router를 위한 fallback
  @RequestMapping(value = "/{path:[^\\.]*}")
  public String forward() {
    return "forward:/index.html";
  }

}
