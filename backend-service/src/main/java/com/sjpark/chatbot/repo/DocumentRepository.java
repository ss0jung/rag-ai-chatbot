package com.sjpark.chatbot.repo;

import com.sjpark.chatbot.domain.Document;
import com.sjpark.chatbot.domain.Namespace;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
  List<Document> findByNamespace(Namespace namespace);
  List<Document> findByStatus(Document.DocumentStatus status);
  List<Document> findByUserIdAndNamespaceId(Long userId, Long namespaceId);
  boolean existsByFileHashAndNamespaceId(String fileHash, Long namespaceId);
}
