import { useState, useRef } from 'react';
import { Upload, FileText, X, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { documentApi } from '../services/documentApi';
import type { Document } from '../App';

interface DocumentUploaderProps {
  onUpload: (documents: Document[]) => void;
  vaultId: string;
  vaultName?: string;
  userId?: number;
}

export default function DocumentUploader({ onUpload, vaultId, vaultName, userId = 1 }: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024;
    });

    if (validFiles.length !== files.length) {
      toast.error('일부 파일이 지원되지 않거나 크기가 10MB를 초과합니다. PDF 파일만 업로드 가능합니다.');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('업로드할 파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const newDocuments: Document[] = [];
      const totalFiles = selectedFiles.length;

      // Upload files sequentially
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];

        try {
          // Upload file to backend
          const response = await documentApi.uploadDocument(userId, vaultId, file);

          // Create document object from response
          const document: Document = {
            id: response.id,
            name: response.fileName,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(response.createdAt),
            content: `문서가 업로드되어 처리 중입니다.`,
            vaultId
          };

          newDocuments.push(document);

          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));

          toast.success(`${file.name} 업로드 완료`);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`${file.name} 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }

      // Update parent component with uploaded documents
      if (newDocuments.length > 0) {
        onUpload(newDocuments);
        toast.success(`${newDocuments.length}개의 문서가 업로드되었습니다`);
      }

      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {vaultName && (
        <Alert className="bg-blue-50 border-blue-200">
          <FolderOpen className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <span className="text-blue-900">
              <span className="mr-1">업로드 대상:</span>
              <span className="font-semibold">{vaultName}</span>
            </span>
          </AlertDescription>
        </Alert>
      )}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept=".pdf"
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="mb-2 text-gray-700">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-gray-500 mb-4">
          PDF 파일만 지원 (최대 10MB)
        </p>
        <Button onClick={onButtonClick} variant="outline">
          파일 선택
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm">선택된 파일:</p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 flex-shrink-0 text-blue-600" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeFile(index)}
                className="flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-xs text-center text-gray-600">
            업로드 중... {uploadProgress}%
          </p>
        </div>
      )}

      {selectedFiles.length > 0 && !uploading && (
        <Button onClick={handleUpload} className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          업로드
        </Button>
      )}
    </div>
  );
}
