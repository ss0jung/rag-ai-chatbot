export interface NamespaceResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface NamespaceWithTotalCnt {
  namespace: NamespaceResponse;
  documentTotalCnt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const API_BASE_URL = 'http://127.0.0.1:8080/api/v1';

export const namespaceApi = {
  // 사용자의 네임스페이스 목록 조회
  async getNamespaces(userId: string): Promise<NamespaceWithTotalCnt[]> {
    const response = await fetch(`${API_BASE_URL}/namespaces?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch namespaces: ${response.statusText}`);
    }
    
    const apiResponse: ApiResponse<NamespaceWithTotalCnt[]> = await response.json();
    
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch namespaces');
    }
    
    return apiResponse.data;
  },

  // 새로운 네임스페이스 생성
  async createNamespace(userId: string, name: string, description?: string): Promise<NamespaceResponse> {
    const response = await fetch(`${API_BASE_URL}/namespaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        name,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create namespace: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<NamespaceResponse> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create namespace');
    }

    return apiResponse.data;
  },

  // 네임스페이스 삭제
  async deleteNamespace(userId: string, namespaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/namespaces/${namespaceId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete namespace: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<null> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to delete namespace');
    }
  },
};