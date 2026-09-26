import axios, { AxiosError } from 'axios';
import type {
  UserProfile,
  RepositoryItem,
  FileItem,
  FileContentResponse,
  ConversationItem,
  ConversationDetail,
  ArchitectureGraphData,
  BlastRadiusResponse,
  KnowledgeGraphData,
  WorkflowsResponse,
  DataFlowResponse,
  SequenceResponse,
  LifecycleResponse,
  TraceNodeResponse,
  FindPathResponse,
  WhyRelationshipResponse,
  ExplainComponentResponse,
  CalculateImpactResponse,
  ChangeImpactResponse,
  EdgeEvidenceResponse,
  NodeEvidenceResponse,
  EvidenceStatsResponse,
  VerifyClaimResponse,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send session_token cookies across origins
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Global request interceptor to attach Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('codelens_token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor for formatted errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status || 500;
    const data = error.response?.data;
    const message = data?.detail || data?.message || error.message || 'Request failed';
    return Promise.reject(new ApiError(message, status, data));
  }
);

export const api = {
  // Auth & User Profile
  getGitHubOAuthUrl: async () => {
    const res = await apiClient.get<{ url: string; state: string }>('/auth/github');
    return res.data;
  },
  handleGitHubCallback: async (code: string) => {
    const res = await apiClient.get<{ access_token: string; user: UserProfile }>(`/auth/callback?code=${code}`);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<UserProfile>('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post<{ detail: string }>('/auth/logout');
    return res.data;
  },
  getUserProfile: async () => {
    const res = await apiClient.get<UserProfile>('/user/profile');
    return res.data;
  },
  updateOpenAIKey: async (apiKey: string) => {
    const res = await apiClient.put<UserProfile>('/user/openai-key', { api_key: apiKey });
    return res.data;
  },
  deleteOpenAIKey: async () => {
    const res = await apiClient.delete<{ status: string; has_key: boolean; message: string }>('/user/openai-key');
    return res.data;
  },
  updateGeminiKey: async (apiKey: string) => {
    const res = await apiClient.put<UserProfile>('/user/openai-key', { api_key: apiKey });
    return res.data;
  },
  deleteGeminiKey: async () => {
    const res = await apiClient.delete<{ status: string; has_key: boolean; message: string }>('/user/openai-key');
    return res.data;
  },

  // Repositories
  getRepositories: async () => {
    const res = await apiClient.get<{ repositories: RepositoryItem[]; total: number }>('/repositories');
    return res.data;
  },
  getGitHubUserRepos: async () => {
    const res = await apiClient.get<{
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        html_url: string;
        description?: string;
        default_branch: string;
        owner: string;
        is_fork?: boolean;
      }>;
    }>('/repositories/github/user-repos');
    return res.data;
  },
  addRepository: async (url: string) => {
    const res = await apiClient.post<RepositoryItem>('/repositories', { url });
    return res.data;
  },
  getRepository: async (repoId: number) => {
    const res = await apiClient.get<RepositoryItem>(`/repositories/${repoId}`);
    return res.data;
  },
  indexRepository: async (repoId: number) => {
    const res = await apiClient.post<{ status: string; task_id?: string; message?: string }>(
      `/repositories/${repoId}/index`
    );
    return res.data;
  },
  getFiles: async (repoId: number) => {
    const res = await apiClient.get<FileItem[]>(`/repositories/${repoId}/files`);
    return res.data;
  },
  getFileContent: async (repoId: number, fileId: number) => {
    const res = await apiClient.get<FileContentResponse>(`/repositories/${repoId}/files/${fileId}`);
    return res.data;
  },
  getArchitecture: async (repoId: number) => {
    const res = await apiClient.get<ArchitectureGraphData>(`/repositories/${repoId}/architecture`);
    return res.data;
  },
  getKnowledgeGraph: async (repoId: number) => {
    const res = await apiClient.get<KnowledgeGraphData>(`/repositories/${repoId}/knowledge-graph`);
    return res.data;
  },
  buildKnowledgeGraph: async (repoId: number) => {
    const res = await apiClient.post<KnowledgeGraphData>(`/repositories/${repoId}/knowledge-graph/build`);
    return res.data;
  },
  getWorkflows: async (repoId: number) => {
    const res = await apiClient.get<WorkflowsResponse>(`/repositories/${repoId}/workflows`);
    return res.data;
  },
  buildWorkflows: async (repoId: number) => {
    const res = await apiClient.post<WorkflowsResponse>(`/repositories/${repoId}/workflows/build`);
    return res.data;
  },
  getDataFlows: async (repoId: number) => {
    const res = await apiClient.get<DataFlowResponse>(`/repositories/${repoId}/data-flows`);
    return res.data;
  },
  buildDataFlows: async (repoId: number) => {
    const res = await apiClient.post<DataFlowResponse>(`/repositories/${repoId}/data-flows/build`);
    return res.data;
  },
  getSequences: async (repoId: number) => {
    const res = await apiClient.get<SequenceResponse>(`/repositories/${repoId}/sequences`);
    return res.data;
  },
  buildSequences: async (repoId: number) => {
    const res = await apiClient.post<SequenceResponse>(`/repositories/${repoId}/sequences/build`);
    return res.data;
  },
  getLifecycles: async (repoId: number) => {
    const res = await apiClient.get<LifecycleResponse>(`/repositories/${repoId}/lifecycles`);
    return res.data;
  },
  buildLifecycles: async (repoId: number) => {
    const res = await apiClient.post<LifecycleResponse>(`/repositories/${repoId}/lifecycles/build`);
    return res.data;
  },
  getBlastRadius: async (repoId: number, symbol: string) => {
    const res = await apiClient.get<BlastRadiusResponse>(
      `/repositories/${repoId}/blast-radius?symbol=${encodeURIComponent(symbol)}`
    );
    return res.data;
  },

  // Interactive Trace & Explore System (All 5 Views)
  traceNode: async (repoId: number, nodeId: string, view = 'architecture', depth = 1) => {
    const res = await apiClient.get<TraceNodeResponse>(
      `/repositories/${repoId}/trace/node?node_id=${encodeURIComponent(nodeId)}&view=${encodeURIComponent(view)}&depth=${depth}`
    );
    return res.data;
  },
  findPath: async (repoId: number, startNode: string, endNode: string, view = 'architecture', maxHops = 8) => {
    const res = await apiClient.get<FindPathResponse>(
      `/repositories/${repoId}/trace/path?start_node=${encodeURIComponent(startNode)}&end_node=${encodeURIComponent(endNode)}&view=${encodeURIComponent(view)}&max_hops=${maxHops}`
    );
    return res.data;
  },
  whyRelationship: async (
    repoId: number,
    params: { edgeId?: string; source?: string; target?: string; view?: string }
  ) => {
    const query = new URLSearchParams();
    if (params.edgeId) query.set('edge_id', params.edgeId);
    if (params.source) query.set('source', params.source);
    if (params.target) query.set('target', params.target);
    if (params.view) query.set('view', params.view);
    const res = await apiClient.get<WhyRelationshipResponse>(
      `/repositories/${repoId}/trace/why?${query.toString()}`
    );
    return res.data;
  },
  explainComponent: async (repoId: number, nodeId: string, view = 'architecture') => {
    const res = await apiClient.post<ExplainComponentResponse>(
      `/repositories/${repoId}/trace/explain`,
      { node_id: nodeId, view }
    );
    return res.data;
  },
  calculateImpact: async (repoId: number, nodeId: string, view = 'architecture', maxDepth = 5) => {
    const res = await apiClient.get<CalculateImpactResponse>(
      `/repositories/${repoId}/trace/impact?node_id=${encodeURIComponent(nodeId)}&view=${encodeURIComponent(view)}&max_depth=${maxDepth}`
    );
    return res.data;
  },
  changeImpact: async (repoId: number, params: { filePath?: string; symbol?: string }) => {
    const query = new URLSearchParams();
    if (params.filePath) query.set('file_path', params.filePath);
    if (params.symbol) query.set('symbol', params.symbol);
    const res = await apiClient.get<ChangeImpactResponse>(
      `/repositories/${repoId}/trace/change-impact?${query.toString()}`
    );
    return res.data;
  },

  // Evidence & Verification Layer
  getEdgeEvidence: async (
    repoId: number,
    params: { edgeId?: string; source?: string; target?: string }
  ) => {
    const query = new URLSearchParams();
    if (params.edgeId) query.set('edge_id', params.edgeId);
    if (params.source) query.set('source', params.source);
    if (params.target) query.set('target', params.target);
    const res = await apiClient.get<EdgeEvidenceResponse>(
      `/repositories/${repoId}/evidence/edge?${query.toString()}`
    );
    return res.data;
  },
  getNodeEvidence: async (repoId: number, nodeId: string) => {
    const res = await apiClient.get<NodeEvidenceResponse>(
      `/repositories/${repoId}/evidence/node?node_id=${encodeURIComponent(nodeId)}`
    );
    return res.data;
  },
  getEvidenceStats: async (repoId: number) => {
    const res = await apiClient.get<EvidenceStatsResponse>(
      `/repositories/${repoId}/evidence/stats`
    );
    return res.data;
  },
  verifyClaim: async (
    repoId: number,
    params: { source: string; target: string; relationship: string }
  ) => {
    const query = new URLSearchParams({
      source: params.source,
      target: params.target,
      relationship: params.relationship,
    });
    const res = await apiClient.get<VerifyClaimResponse>(
      `/repositories/${repoId}/evidence/verify?${query.toString()}`
    );
    return res.data;
  },

  // Chat & Copilot
  getConversations: async (repoId: number) => {
    const res = await apiClient.get<{ conversations: ConversationItem[]; total: number }>(
      `/repositories/${repoId}/chats`
    );
    return res.data;
  },
  createConversation: async (repoId: number, title?: string) => {
    const res = await apiClient.post<ConversationItem>(`/repositories/${repoId}/chats`, { title });
    return res.data;
  },
  getConversation: async (repoId: number, chatId: number) => {
    const res = await apiClient.get<ConversationDetail>(`/repositories/${repoId}/chats/${chatId}`);
    return res.data;
  },
  deleteConversation: async (repoId: number, chatId: number) => {
    const res = await apiClient.delete<{ detail: string }>(`/repositories/${repoId}/chats/${chatId}`);
    return res.data;
  },
};
