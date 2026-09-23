import type {
  UserProfile,
  RepositoryItem,
  FileItem,
  FileContentResponse,
  ConversationItem,
  ConversationDetail,
  ArchitectureGraphData,
  BlastRadiusResponse,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures session_token cookie is sent
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignored if non-json
    }
    const message = errorData?.detail || errorData?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth & User Profile
  getMe: () => request<UserProfile>('/auth/me'),
  logout: () => request<{ detail: string }>('/auth/logout', { method: 'POST' }),
  getUserProfile: () => request<UserProfile>('/user/profile'),
  updateGeminiKey: (apiKey: string) =>
    request<UserProfile>('/user/gemini-key', {
      method: 'PUT',
      body: JSON.stringify({ api_key: apiKey }),
    }),

  // Repositories
  getRepositories: () =>
    request<{ repositories: RepositoryItem[]; total: number }>('/repositories'),
  addRepository: (url: string) =>
    request<RepositoryItem>('/repositories', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  getRepository: (repoId: number) =>
    request<RepositoryItem>(`/repositories/${repoId}`),
  indexRepository: (repoId: number) =>
    request<{ status: string; task_id?: string; message?: string }>(`/repositories/${repoId}/index`, {
      method: 'POST',
    }),
  getFiles: (repoId: number) =>
    request<FileItem[]>(`/repositories/${repoId}/files`),
  getFileContent: (repoId: number, fileId: number) =>
    request<FileContentResponse>(`/repositories/${repoId}/files/${fileId}`),
  getArchitecture: (repoId: number) =>
    request<ArchitectureGraphData>(`/repositories/${repoId}/architecture`),
  getBlastRadius: (repoId: number, symbol: string) =>
    request<BlastRadiusResponse>(`/repositories/${repoId}/blast-radius?symbol=${encodeURIComponent(symbol)}`),

  // Chat & Copilot
  getConversations: (repoId: number) =>
    request<{ conversations: ConversationItem[]; total: number }>(`/repositories/${repoId}/chats`),
  createConversation: (repoId: number, title?: string) =>
    request<ConversationItem>(`/repositories/${repoId}/chats`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getConversation: (repoId: number, chatId: number) =>
    request<ConversationDetail>(`/repositories/${repoId}/chats/${chatId}`),
  deleteConversation: (repoId: number, chatId: number) =>
    request<{ detail: string }>(`/repositories/${repoId}/chats/${chatId}`, {
      method: 'DELETE',
    }),
};

export { ApiError };
