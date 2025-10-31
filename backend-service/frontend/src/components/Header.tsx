import { BookOpenCheck, Menu } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="mr-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
            <BookOpenCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl">DocuRise AI</h1>
            <p className="text-xs text-gray-500">RAG 기반 문서 지능형 챗봇</p>
          </div>
        </div>
      </div>
    </header>
  );
}
