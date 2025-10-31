package com.sjpark.chatbot.repo;

import com.sjpark.chatbot.domain.Namespace;
import com.sjpark.chatbot.domain.User;
import com.sjpark.chatbot.dto.NamespaceWithTotalCnt;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NamespaceRepository extends JpaRepository<Namespace,Long> {
  List<Namespace> findByUser(User user);
  boolean existsByUserAndName(User user, String name);

  @Query("SELECT new com.sjpark.chatbot.dto.NamespaceWithTotalCnt(n, COUNT(d)) " +
      "FROM Namespace n " +
      "LEFT JOIN n.documents d " +
      "WHERE n.user = :user " +
      "GROUP BY n " +
      "ORDER BY n.createdAt DESC")
  List<NamespaceWithTotalCnt> findByUserWithDocumentTotalCnt(@Param("user") User user);
}
