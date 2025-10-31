import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, ShieldCheck, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import type { Document, DocumentVault, Message } from '../App';

interface ChatInterfaceProps {
  vault?: DocumentVault;
  documents: Document[];
  sessionId: string | null;
  onCreateSession: (vaultId: string, title: string) => void;
}

const SAMPLE_QUESTIONS = [
  '이 문서의 주요 내용을 요약해주세요',
  '시스템 요구사항이 무엇인가요?',
  '어떤 기능들이 있나요?',
  '사용 방법을 알려주세요'
];

export default function ChatInterface({ vault, documents, sessionId, onCreateSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Reset messages when session changes
    if (sessionId === null) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: vault 
            ? `"${vault.name}" 보관함의 문서에 대해 질문해주세요. ${documents.length}개의 문서가 준비되어 있습니다.`
            : '문서 보관함을 선택하고 질문해주세요.',
          timestamp: new Date()
        }
      ]);
    }
  }, [sessionId, vault, documents.length]);

  const findRelevantDocuments = (query: string) => {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 1);
    const scoredDocs = documents.map(doc => {
      let score = 0;
      const content = (doc.name + ' ' + doc.content).toLowerCase();
      
      keywords.forEach(keyword => {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      });
      
      return { doc, score };
    }).filter(item => item.score > 0);

    scoredDocs.sort((a, b) => b.score - a.score);
    
    return scoredDocs.slice(0, 3).map(item => ({
      documentName: item.doc.name,
      excerpt: item.doc.content.substring(0, 150) + '...',
      relevance: Math.min(95, 60 + item.score * 10)
    }));
  };

  const generateResponse = (query: string, sources: Message['sources']): { content: string; confidence: number } => {
    const lowerQuery = query.toLowerCase();
    
    let content = '';
    let confidence = 0;

    if (lowerQuery.includes('요약') || lowerQuery.includes('주요') || lowerQuery.includes('내용')) {
      content = '업로드된 문서들을 분석한 결과, 다음과 같은 주요 내용을 확인했습니다:\n\n1. 최신 AI 기술을 활용한 RAG 솔루션\n2. 자동 문서 분석 및 지능형 검색 기능\n3. 실시간 답변 생성 시스템\n\n각 문서에서 추출한 핵심 정보를 바탕으로 답변을 구성했습니다.';
      confidence = sources && sources.length > 0 ? 92 : 75;
    } else if (lowerQuery.includes('요구사항') || lowerQuery.includes('시스템')) {
      content = '시스템 요구사항은 다음과 같습니다:\n\n• 최소 8GB RAM\n• 듀얼코어 프로세서\n• 지원 OS: Windows 10 이상, macOS 11 이상, Ubuntu 20.04 이상\n• API는 REST 기반이며 JSON 형식 사용\n\n기술 사양서 문서에서 확인된 정보입니다.';
      confidence = 88;
    } else if (lowerQuery.includes('기능') || lowerQuery.includes('특징')) {
      content = '주요 기능은 다음과 같습니다:\n\n1. 자동 문서 분석: 업로드된 문서를 AI가 자동으로 분석\n2. 지능형 검색: RAG 기술로 정확한 정보 검색\n3. 실시간 답변 생성: 질문에 대한 즉각적인 답변 제공\n4. 다양한 파일 형식 지원: PDF, DOCX, TXT 등\n\n각 기능은 최신 AI 기술로 구현되었습니다.';
      confidence = 90;
    } else if (lowerQuery.includes('사용') || lowerQuery.includes('방법') || lowerQuery.includes('시작')) {
      content = '시작하는 방법:\n\n1. 문서 보관함을 선택하거나 새로 생성합니다\n2. 보관함에 문서를 업로드합니다\n3. 채팅창에서 문서 내용에 대해 질문합니다\n\n시스템이 자동으로 관련 문서를 찾아 정확한 답변을 생성합니다.';
      confidence = 94;
    } else if (sources && sources.length > 0) {
      content = `질문하신 내용과 관련하여 ${sources.length}개의 문서에서 정보를 찾았습니다.\n\n문서들을 분석한 결과, 귀하의 질문과 관련된 내용이 포함되어 있습니다. 더 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.\n\n아래 참고 문서의 관련 내용을 확인해보세요.`;
      confidence = 78;
    } else {
      content = '죄송합니다. 현재 보관함의 문서에서 관련 정보를 찾을 수 없습니다.\n\n다음을 시도해보세요:\n• 질문을 다르게 표현해보세요\n• 관련 문서를 보관함에 추가해보세요\n• 다른 보관함을 선택해보세요';
      confidence = 45;
    }

    return { content, confidence };
  };

  const handleSend = async (question?: string) => {
    const queryText = question || input;
    if (!queryText.trim() || isLoading || !vault) return;

    // Create session if it's the first message
    if (sessionId === null && vault) {
      const title = queryText.length > 30 ? queryText.substring(0, 30) + '...' : queryText;
      onCreateSession(vault.id, title);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const sources = findRelevantDocuments(queryText);
    const { content, confidence } = generateResponse(queryText, sources.length > 0 ? sources : undefined);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      sources: sources.length > 0 ? sources : undefined,
      confidence,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-blue-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 85) return '높음';
    if (confidence >= 70) return '중간';
    if (confidence >= 50) return '보통';
    return '낮음';
  };

  if (!vault) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>문서 보관함을 선택해주세요</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="mb-2">"{vault.name}" 보관함에 문서가 없습니다</p>
          <p className="text-sm">문서를 업로드하고 질문을 시작하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Vault Info Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg">{vault.name}</h2>
            <p className="text-sm text-gray-500">
              {documents.length}개의 문서 • {vault.description || '문서에 대해 질문하세요'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        <div className="py-6 space-y-6">
          {/* Sample Questions - Show only at start */}
          {messages.length <= 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">💡 샘플 질문:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(question)}
                    className="p-3 text-sm text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-br from-purple-600 to-blue-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`flex-1 ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}
              >
                <div
                  className={`inline-block max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  } rounded-2xl px-5 py-3`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Confidence Score for Assistant */}
                  {message.role === 'assistant' && message.confidence !== undefined && (
                    <div className="mt-4 pt-4 border-t border-gray-300 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          신뢰도
                        </span>
                        <span className={getConfidenceColor(message.confidence)}>
                          {message.confidence}% ({getConfidenceLabel(message.confidence)})
                        </span>
                      </div>
                      <Progress value={message.confidence} className="h-2" />
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <Collapsible className="mt-4 pt-4 border-t border-gray-300">
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full">
                        <FileText className="w-4 h-4" />
                        <span>참고 문서 ({message.sources.length})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        {message.sources.map((source, index) => (
                          <div
                            key={index}
                            className="p-3 bg-white rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm">{source.documentName}</p>
                              <Badge variant="secondary" className="text-xs">
                                관련도 {source.relevance}%
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {source.excerpt}
                            </p>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="inline-block bg-gray-100 rounded-2xl px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    <span className="text-sm text-gray-600">답변 생성 중...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`"${vault.name}" 문서에 대해 질문하세요...`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: 구체적인 질문을 하면 더 정확한 답변을 받을 수 있습니다
        </p>
      </div>
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={`border-t border-gray-200 ${className}`} />;
}
