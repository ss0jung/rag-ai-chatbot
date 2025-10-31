import { useState } from "react";
import Header from "./components/Header";
import LeftSidebar from "./components/LeftSidebar";
import ChatInterface from "./components/ChatInterface";
import { Toaster } from "./components/ui/sonner";

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  content: string;
  vaultId: string;
}

export interface DocumentVault {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  documentCount: number;
}

export interface ChatSession {
  id: string;
  title: string;
  vaultId: string;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentName: string;
    excerpt: string;
    relevance: number;
  }>;
  confidence?: number;
  timestamp: Date;
}

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);
  const [vaults, setVaults] = useState<DocumentVault[]>([
    {
      id: "1",
      name: "기본 문서함",
      description: "기본 문서 보관함",
      createdAt: new Date("2025-10-15"),
      documentCount: 2,
    },
    {
      id: "2",
      name: "사용자 가이드",
      description: "사용자 매뉴얼 및 FAQ",
      createdAt: new Date("2025-10-20"),
      documentCount: 1,
    },
  ]);

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "제품_가이드.pdf",
      type: "application/pdf",
      size: 2048000,
      uploadedAt: new Date("2025-10-20"),
      content:
        "이 제품은 최신 AI 기술을 활용한 솔루션입니다. 주요 기능으로는 자동 문서 분석, 지능형 검색, 실시간 답변 생성이 있습니다. RAG(Retrieval-Augmented Generation) 기술을 사용하여 정확도를 높였습니다.",
      vaultId: "1",
    },
    {
      id: "2",
      name: "기술_사양서.pdf",
      type: "application/pdf",
      size: 3072000,
      uploadedAt: new Date("2025-10-22"),
      content:
        "시스템 요구사항: 최소 8GB RAM, 듀얼코어 프로세서. 지원 OS: Windows 10 이상, macOS 11 이상, Ubuntu 20.04 이상. API는 REST 기반이며 JSON 형식을 사용합니다.",
      vaultId: "1",
    },
    {
      id: "3",
      name: "사용자_매뉴얼.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 1536000,
      uploadedAt: new Date("2025-10-25"),
      content:
        "시작하기: 1. 문서 보관함을 선택하거나 생성합니다. 2. 문서를 업로드합니다. 3. 채팅창에서 질문합니다. 시스템이 자동으로 관련 문서를 찾아 답변을 생성합니다.",
      vaultId: "2",
    },
  ]);

  const [chatSessions, setChatSessions] = useState<
    ChatSession[]
  >([
    {
      id: "1",
      title: "제품 기능에 대한 질문",
      vaultId: "1",
      createdAt: new Date("2025-10-26"),
      lastMessageAt: new Date("2025-10-26"),
    },
    {
      id: "2",
      title: "시스템 요구사항 문의",
      vaultId: "1",
      createdAt: new Date("2025-10-27"),
      lastMessageAt: new Date("2025-10-27"),
    },
    {
      id: "3",
      title: "사용 방법 안내",
      vaultId: "2",
      createdAt: new Date("2025-10-28"),
      lastMessageAt: new Date("2025-10-28"),
    },
  ]);

  const [selectedVaultId, setSelectedVaultId] =
    useState<string>("1");
  const [selectedSessionId, setSelectedSessionId] = useState<
    string | null
  >("1");

  const handleCreateVault = (
    name: string,
    description?: string,
  ) => {
    const newVault: DocumentVault = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: new Date(),
      documentCount: 0,
    };
    setVaults([...vaults, newVault]);
    setSelectedVaultId(newVault.id);
  };

  const handleDeleteVault = (id: string) => {
    setVaults(vaults.filter((v) => v.id !== id));
    setDocuments(documents.filter((d) => d.vaultId !== id));
    setChatSessions(
      chatSessions.filter((s) => s.vaultId !== id),
    );
    if (selectedVaultId === id) {
      setSelectedVaultId(vaults[0]?.id || "");
      setSelectedSessionId(null);
    }
  };

  const handleUploadDocuments = (newDocuments: Document[]) => {
    setDocuments([...documents, ...newDocuments]);
    // Update document count
    const vault = vaults.find((v) => v.id === selectedVaultId);
    if (vault) {
      setVaults(
        vaults.map((v) =>
          v.id === selectedVaultId
            ? {
                ...v,
                documentCount:
                  v.documentCount + newDocuments.length,
              }
            : v,
        ),
      );
    }
  };

  const handleDeleteDocument = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    setDocuments(documents.filter((d) => d.id !== id));
    if (doc) {
      setVaults(
        vaults.map((v) =>
          v.id === doc.vaultId
            ? {
                ...v,
                documentCount: Math.max(0, v.documentCount - 1),
              }
            : v,
        ),
      );
    }
  };

  const handleCreateSession = (
    vaultId: string,
    title: string,
  ) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      vaultId,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };
    setChatSessions([newSession, ...chatSessions]);
    setSelectedSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setChatSessions(chatSessions.filter((s) => s.id !== id));
    if (selectedSessionId === id) {
      setSelectedSessionId(null);
    }
  };

  const handleSelectVault = (vaultId: string) => {
    setSelectedVaultId(vaultId);
    setSelectedSessionId(null);
  };

  const vaultDocuments = documents.filter(
    (d) => d.vaultId === selectedVaultId,
  );
  const selectedVault = vaults.find(
    (v) => v.id === selectedVaultId,
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onToggleSidebar={() =>
          setIsSidebarCollapsed(!isSidebarCollapsed)
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          vaults={vaults}
          documents={documents}
          chatSessions={chatSessions}
          selectedVaultId={selectedVaultId}
          selectedSessionId={selectedSessionId}
          onSelectVault={handleSelectVault}
          onCreateVault={handleCreateVault}
          onDeleteVault={handleDeleteVault}
          onUploadDocuments={handleUploadDocuments}
          onDeleteDocument={handleDeleteDocument}
          onSelectSession={setSelectedSessionId}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
        />

        <main className="flex-1 overflow-hidden">
          <ChatInterface
            vault={selectedVault}
            documents={vaultDocuments}
            sessionId={selectedSessionId}
            onCreateSession={handleCreateSession}
          />
        </main>
      </div>

      <Toaster />
    </div>
  );
}