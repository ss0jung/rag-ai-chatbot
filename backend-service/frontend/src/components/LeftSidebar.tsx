import { useState } from 'react';
import { 
  MessageSquare, 
  FolderOpen, 
  Upload, 
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import DocumentUploader from './DocumentUploader';
import type { DocumentVault, Document, ChatSession } from '../App';

interface LeftSidebarProps {
  isCollapsed: boolean;
  vaults: DocumentVault[];
  documents: Document[];
  chatSessions: ChatSession[];
  selectedVaultId: string;
  selectedSessionId: string | null;
  onSelectVault: (vaultId: string) => void;
  onCreateVault: (name: string, description?: string) => Promise<void>;
  onDeleteVault: (id: string) => void;
  onUploadDocuments: (documents: Document[]) => void;
  onDeleteDocument: (id: string) => void;
  onSelectSession: (sessionId: string | null) => void;
  onCreateSession: (vaultId: string, title: string) => void;
  onDeleteSession: (id: string) => void;
}

export default function LeftSidebar({
  isCollapsed,
  vaults,
  documents,
  chatSessions,
  selectedVaultId,
  selectedSessionId,
  onSelectVault,
  onCreateVault,
  onDeleteVault,
  onUploadDocuments,
  onDeleteDocument,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: LeftSidebarProps) {
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultDescription, setNewVaultDescription] = useState('');
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [expandedVaults, setExpandedVaults] = useState<Set<string>>(new Set([selectedVaultId]));

  const handleUploadClick = () => {
    if (!selectedVaultId || vaults.length === 0) {
      toast.error('먼저 문서 보관함을 선택하거나 생성해주세요');
      return;
    }
    setIsUploadOpen(true);
  };

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) {
      toast.error('보관함 이름을 입력하세요');
      return;
    }
    try {
      await onCreateVault(newVaultName, newVaultDescription);
      setNewVaultName('');
      setNewVaultDescription('');
      setIsCreateVaultOpen(false);
    } catch (error) {
      // 에러는 App.tsx에서 처리됨
    }
  };

  const handleDeleteVault = (id: string, name: string) => {
    if (confirm(`"${name}" 보관함을 삭제하시겠습니까? 모든 문서와 채팅 이력이 삭제됩니다.`)) {
      onDeleteVault(id);
      toast.success('보관함이 삭제되었습니다');
    }
  };

  const toggleVault = (vaultId: string) => {
    const newExpanded = new Set(expandedVaults);
    if (newExpanded.has(vaultId)) {
      newExpanded.delete(vaultId);
    } else {
      newExpanded.add(vaultId);
    }
    setExpandedVaults(newExpanded);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
  };

  const vaultSessions = chatSessions.filter(s => s.vaultId === selectedVaultId);
  const vaultDocuments = documents.filter(d => d.vaultId === selectedVaultId);

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Chat History Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-gray-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                채팅 이력
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectSession(null)}
                className="h-7 text-xs"
              >
                + 새 채팅
              </Button>
            </div>
            <div className="space-y-1">
              {vaultSessions.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">채팅 이력이 없습니다</p>
              ) : (
                vaultSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                      selectedSessionId === session.id ? 'bg-blue-50 hover:bg-blue-100' : ''
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{session.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(session.lastMessageAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Document Upload Section */}
          <div>
            <h3 className="text-sm text-gray-500 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              문서 업로드
            </h3>
            {!selectedVaultId || vaults.length === 0 ? (
              <div className="space-y-2">
                <button 
                  onClick={handleUploadClick}
                  className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed text-sm"
                  disabled
                >
                  <Upload className="w-4 h-4 mr-2" />
                  문서 추가
                </button>
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ 문서를 업로드하려면 먼저 보관함을 선택해주세요.
                </p>
              </div>
            ) : (
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <button 
                    onClick={handleUploadClick}
                    className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    문서 추가
                  </button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>문서 업로드</DialogTitle>
                  <DialogDescription>
                    문서를 선택한 보관함에 추가합니다
                  </DialogDescription>
                </DialogHeader>
                <DocumentUploader
                  onUpload={(docs) => {
                    onUploadDocuments(docs);
                    setIsUploadOpen(false);
                  }}
                  vaultId={selectedVaultId}
                  vaultName={vaults.find(v => v.id === selectedVaultId)?.name}
                />
              </DialogContent>
            </Dialog>
            )}
          </div>

          <Separator />

          {/* Document Vaults Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-gray-500 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                문서 보관함
              </h3>
              <Dialog open={isCreateVaultOpen} onOpenChange={setIsCreateVaultOpen}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 문서 보관함</DialogTitle>
                    <DialogDescription>
                      문서를 분류할 새로운 보관함을 만듭니다
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="vault-name">보관함 이름</Label>
                      <Input
                        id="vault-name"
                        value={newVaultName}
                        onChange={(e) => setNewVaultName(e.target.value)}
                        placeholder="예: 제품 문서"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vault-description">설명 (선택)</Label>
                      <Textarea
                        id="vault-description"
                        value={newVaultDescription}
                        onChange={(e) => setNewVaultDescription(e.target.value)}
                        placeholder="보관함에 대한 간단한 설명"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleCreateVault} className="w-full">
                      생성
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1">
              {vaults.map((vault) => (
                <Collapsible
                  key={vault.id}
                  open={expandedVaults.has(vault.id)}
                  onOpenChange={() => toggleVault(vault.id)}
                >
                  <div
                    className={`rounded-lg ${
                      selectedVaultId === vault.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <CollapsibleTrigger asChild>
                        <button className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-gray-100 transition-colors">
                          {expandedVaults.has(vault.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectVault(vault.id)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm truncate">{vault.name}</p>
                          <Badge variant="secondary" className="text-xs ml-2">
                            {vault.documentCount}
                          </Badge>
                        </div>
                        {vault.description && (
                          <p className="text-xs text-gray-500 truncate">{vault.description}</p>
                        )}
                      </div>
                      {vaults.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDeleteVault(vault.id, vault.name)}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                    <CollapsibleContent>
                      <div className="pl-10 pr-2 pb-2 space-y-1">
                        {documents
                          .filter(d => d.vaultId === vault.id)
                          .map((doc) => (
                            <div
                              key={doc.id}
                              className="group flex items-start justify-between p-2 rounded hover:bg-gray-100 text-xs gap-2"
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <FileText className="w-3 h-3 flex-shrink-0 text-blue-600 mt-0.5" />
                                <span className="break-words">{doc.name}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 flex-shrink-0"
                                onClick={() => onDeleteDocument(doc.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        {documents.filter(d => d.vaultId === vault.id).length === 0 && (
                          <p className="text-xs text-gray-400 p-2">문서가 없습니다</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
