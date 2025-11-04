import { useState, useEffect } from "react";
import Header from "./components/Header";
import LeftSidebar from "./components/LeftSidebar";
import ChatInterface from "./components/ChatInterface";
import { Toaster } from "./components/ui/sonner";
import { namespaceApi, type NamespaceResponse } from "./services/namespaceApi";
import { documentApi, type DocumentUploadResponse, type DocumentQueryResponse } from "./services/documentApi";
import { toast } from "sonner";

export interface Document {
  id: number;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
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
  const [vaults, setVaults] = useState<DocumentVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const DEMO_USER_ID = 1;

  const [documents, setDocuments] = useState<Document[]>([]);

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
    useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<
    string | null
  >(null);

  const handleCreateVault = async (
    name: string,
    description?: string,
  ) => {
    try {
      const newNamespace = await namespaceApi.createNamespace(DEMO_USER_ID, name, description);
      const newVault: DocumentVault = {
        id: newNamespace.id.toString(),
        name: newNamespace.name,
        description: newNamespace.description,
        createdAt: new Date(newNamespace.createdAt),
        documentCount: 0,
      };
      setVaults([...vaults, newVault]);
      setSelectedVaultId(newVault.id);
      toast.success('새 보관함이 생성되었습니다');
    } catch (error) {
      console.error('Failed to create vault:', error);
      toast.error('보관함 생성에 실패했습니다');
    }
  };

  const handleDeleteVault = async (id: string) => {
    try {
      await namespaceApi.deleteNamespace(DEMO_USER_ID.toString(), id);
      setVaults(vaults.filter((v) => v.id !== id));
      setDocuments(documents.filter((d) => d.vaultId !== id));
      setChatSessions(
        chatSessions.filter((s) => s.vaultId !== id),
      );
      if (selectedVaultId === id) {
        setSelectedVaultId(vaults[0]?.id || "");
        setSelectedSessionId(null);
      }
      toast.success('보관함이 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete vault:', error);
      toast.error('보관함 삭제에 실패했습니다');
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

  const loadVaults = async () => {
    try {
      setIsLoading(true);
      const namespaces = await namespaceApi.getNamespaces(DEMO_USER_ID);
      const mappedVaults: DocumentVault[] = namespaces.map(item => ({
        id: item.namespace.id.toString(),
        name: item.namespace.name,
        description: item.namespace.description,
        createdAt: new Date(item.namespace.createdAt),
        documentCount: item.documentTotalCnt,
      }));
      setVaults(mappedVaults);

      // 첫 번째 보관함을 기본 선택
      if (mappedVaults.length > 0 && !selectedVaultId) {
        setSelectedVaultId(mappedVaults[0].id);
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
      toast.error('문서 보관함 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async (vaultId: string) => {
    if (!vaultId) return;

    try {
      setDocumentsLoading(true);
      const docs = await documentApi.getDocuments(DEMO_USER_ID, parseInt(vaultId));
      const mappedDocuments: Document[] = docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: new Date(doc.uploadedAt),
        vaultId: doc.vaultId.toString(),
      }));
      setDocuments(prevDocs => {
        // 기존 문서 중 다른 보관함의 문서는 유지하고, 현재 보관함의 문서만 교체
        const otherVaultDocs = prevDocs.filter(d => d.vaultId !== vaultId);
        return [...otherVaultDocs, ...mappedDocuments];
      });
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('문서 목록을 불러오는데 실패했습니다');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    loadVaults();
  }, []);

  // 선택된 보관함이 변경될 때 문서 목록 로드
  useEffect(() => {
    if (selectedVaultId) {
      loadDocuments(selectedVaultId);
    }
  }, [selectedVaultId]);

  const vaultDocuments = documents.filter(
    (d) => d.vaultId === selectedVaultId,
  );
  const selectedVault = vaults.find(
    (v) => v.id === selectedVaultId,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">문서 보관함을 불러오는 중...</p>
        </div>
      </div>
    );
  }

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