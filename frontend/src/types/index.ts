export interface UserProfile {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  has_openai_key?: boolean;
  masked_openai_key?: string | null;
  has_gemini_key: boolean;
  masked_gemini_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryItem {
  id: number;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  index_status: 'not_indexed' | 'indexing' | 'indexed' | 'failed';
  last_indexed_commit: string | null;
  last_indexed_at: string | null;
  file_count: number;
  symbol_count: number;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: number;
  repository_id: number;
  file_path: string;
  language: string | null;
  file_size: number;
  line_count: number;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileContentResponse {
  id: number;
  repository_id: number;
  file_path: string;
  language: string | null;
  line_count: number;
  content: string;
}

export interface Citation {
  file_path: string;
  start_line: number;
  end_line: number;
  symbol?: string | null;
  snippet?: string | null;
}

export interface MessageItem {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Citation[];
  created_at: string;
}

export interface ConversationItem {
  id: number;
  repository_id: number;
  user_id: number;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationItem {
  messages: MessageItem[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  file_path: string;
  layer: 'presentation' | 'application' | 'domain' | 'infrastructure' | 'unknown';
  symbol_count: number;
  symbols: Array<{
    name: string;
    kind: string;
    line_number: number;
  }>;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
}

export interface ArchitectureGraphData {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  layer_counts?: Record<string, number>;
}

export interface BlastRadiusResponse {
  target_symbol: string;
  direct_dependencies: string[];
  upstream_dependents: string[];
  downstream_dependencies: string[];
  direct_count: number;
  upstream_count: number;
  downstream_count: number;
  impact_level: 'low' | 'medium' | 'high';
}
