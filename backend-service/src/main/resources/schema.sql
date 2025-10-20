-- ====================================
-- RAG 챗봇 서비스 DB 스키마 (PostgreSQL)
-- ====================================

-- 1. User 테이블
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 2. Namespace 테이블 (문서 보관함)
CREATE TABLE namespaces (
    namespace_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_namespaces_user_id ON namespaces(user_id);
CREATE INDEX idx_namespaces_name ON namespaces(name);

-- 3. Document 테이블
CREATE TABLE documents (
    document_id BIGSERIAL PRIMARY KEY,
    namespace_id BIGINT NOT NULL REFERENCES namespaces(namespace_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL, -- PDF, TXT
    file_size BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'QUEUED', -- QUEUED, PARSING, CHUNKING, EMBEDDING, INDEXING, DONE, ERROR
    error_message TEXT,
    metadata JSONB, -- 페이지 수, 청크 수 등
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_namespace_id ON documents(namespace_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);

-- 4. Conversation 테이블 (채팅 세션)
CREATE TABLE conversations (
    conversation_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    namespace_ids BIGINT[], -- 선택한 보관함 목록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- 5. Message 테이블
CREATE TABLE messages (
    message_id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- USER, ASSISTANT
    content TEXT NOT NULL,
    citations JSONB, -- [{docId, title, page, score, text}]
    confidence NUMERIC(3, 2), -- 0.00 ~ 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ====================================
-- 초기 테스트 데이터
-- ====================================

-- 테스트 사용자
INSERT INTO users (username, password, email, role) VALUES
('demo', '$2a$10$dummyHashedPassword123456789', 'demo@example.com', 'USER'),
('admin', '$2a$10$dummyHashedPassword123456789', 'admin@example.com', 'ADMIN');

-- 테스트 보관함
INSERT INTO namespaces (user_id, name, description, color_code) VALUES
(1, 'mobile-2024', '2024년 모바일 시장 보고서', 'rose'),
(1, 'ai-reports', 'AI 산업 분석 자료', 'emerald'),
(1, 'hr-policy', '인사 정책 문서', 'sky');

-- 테스트 문서
INSERT INTO documents (namespace_id, user_id, title, filename, file_path, file_type, file_size, status, metadata) VALUES
(1, 1, '모바일 2024 보고서', 'mobile-2024.pdf', '/uploads/mobile-2024.pdf', 'PDF', 2048576, 'DONE', '{"pages": 45, "chunks": 120}'),
(2, 1, '글로벌 스마트폰 동향', 'smartphone-trends.pdf', '/uploads/smartphone-trends.pdf', 'PDF', 1536000, 'DONE', '{"pages": 32, "chunks": 85}'),
(3, 1, '표시 2023', 'display-2023.txt', '/uploads/display-2023.txt', 'TXT', 512000, 'DONE', '{"lines": 890, "chunks": 45}');

-- 테스트 대화
INSERT INTO conversations (user_id, title, namespace_ids) VALUES
(1, '새 세션', ARRAY[1, 2]);

-- 테스트 메시지
INSERT INTO messages (conversation_id, role, content, citations, confidence) VALUES
(1, 'USER', '2024년 스마트폰 시장 동향을 요약해줘', NULL, NULL),
(1, 'ASSISTANT', '2024년 스마트폰 시장은 프리미엄 세그먼트 성장과 5G 보급 확대가 주요 트렌드입니다.',
 '[{"docId": "d1", "title": "모바일 2024", "page": 8, "score": 0.82}]', 0.76);