package com.sjpark.chatbot.repo;

import com.sjpark.chatbot.domain.Namespace;
import com.sjpark.chatbot.domain.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NamespaceRepository extends JpaRepository<Namespace,Long> {
  List<Namespace> findByUser(User user);
  boolean existsByUserAndName(User user, String name);
}
