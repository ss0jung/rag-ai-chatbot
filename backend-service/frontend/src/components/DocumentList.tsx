import { FileText, Trash2, File } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import type { Document } from '../App';

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const handleDelete = (id: string, name: string) => {
    onDelete(id);
    toast.success(`"${name}"이(가) 삭제되었습니다`);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm">
          업로드된 문서가 없습니다
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="text-2xl flex-shrink-0">
                  {getFileIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm mb-1 truncate">{doc.name}</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(doc.size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    분석 완료
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(doc.id, doc.name)}
                className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
