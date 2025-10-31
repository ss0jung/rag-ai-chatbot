export interface DocumentUploadResponse {
  id : string;
  fileName : string;
  createdAt : string;
}

export interface DocumentQueryResponse {
  id: number;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  vaultId: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const API_BASE_URL = 'http://127.0.0.1:8080/api/v1';

export const documentApi = {
  // 네임스페이스별 문서 목록 조회
  async getDocuments(userId: number, namespaceId: number): Promise<DocumentQueryResponse[]> {
    const response = await fetch(`${API_BASE_URL}/namespaces/${namespaceId}/documents?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<DocumentQueryResponse[]> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch documents');
    }

    return apiResponse.data;
  },

  // 네임스페이스에 문서 업로드
  async uploadDocument(userId: string, namespaceId: string, file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);
    formData.append('namespaceId', namespaceId);

    const response = await fetch(`${API_BASE_URL}/namespaces/${namespaceId}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload document: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<DocumentUploadResponse> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to upload document');
    }

    return apiResponse.data;
  },
};