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

// ---------------------------------------------------------------------------
// Unified Architecture Knowledge Graph Types
// ---------------------------------------------------------------------------

export type ArchNodeType =
  | 'application'
  | 'service'
  | 'module'
  | 'component'
  | 'api_endpoint'
  | 'database'
  | 'database_model'
  | 'external_service'
  | 'queue'
  | 'worker'
  | 'storage'
  | 'function'
  | 'class'
  | 'lifecycle_entity';

export type ArchLayerType =
  | 'presentation'
  | 'api_gateway'
  | 'application'
  | 'domain'
  | 'infrastructure'
  | 'unknown';

export type RelationshipType =
  | 'IMPORTS'
  | 'CALLS'
  | 'DEPENDS_ON'
  | 'EXPOSES'
  | 'CONSUMES'
  | 'READS'
  | 'WRITES'
  | 'PERSISTS'
  | 'AUTHENTICATES'
  | 'EMITS'
  | 'LISTENS'
  | 'TRIGGERS'
  | 'TRANSFORMS'
  | 'CONTAINS'
  | 'IMPLEMENTS';

export interface SourceEvidence {
  file_path: string;
  start_line: number;
  end_line: number;
  snippet?: string | null;
}

export interface ArchSymbol {
  name: string;
  kind: string;
  line_number: number;
  end_line?: number;
  docstring?: string;
  code_snippet?: string;
}

export interface ArchKGNode {
  id: string;
  type: ArchNodeType;
  name: string;
  display_name: string;
  layer: ArchLayerType;
  description: string;
  source_files: string[];
  symbols: ArchSymbol[];
  metadata: Record<string, any>;
  confidence: number;
  confidence_level: 'deterministic' | 'high' | 'medium' | 'low';
  evidence: SourceEvidence[];
}

export interface ArchKGEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType;
  direction: 'directed' | 'bidirectional';
  confidence: number;
  confidence_level: 'deterministic' | 'high' | 'medium' | 'low';
  evidence: SourceEvidence[];
  metadata?: Record<string, any>;
}

export interface KnowledgeGraphData {
  nodes: ArchKGNode[];
  edges: ArchKGEdge[];
  metadata?: {
    total_nodes: number;
    total_edges: number;
    node_types?: Record<string, number>;
    edge_types?: Record<string, number>;
    layers?: Record<string, number>;
    avg_edge_confidence?: number;
    deterministic_edges?: number;
    inferred_edges?: number;
    [key: string]: any;
  };
}

// ---------------------------------------------------------------------------
// Unified Workflow Types
// ---------------------------------------------------------------------------

export type WorkflowStepType =
  | 'start'
  | 'step'
  | 'decision'
  | 'parallel'
  | 'failure'
  | 'retry'
  | 'external'
  | 'approval'
  | 'async_op'
  | 'end';

export type WorkflowTransitionType =
  | 'normal'
  | 'success'
  | 'failure'
  | 'retry'
  | 'async';

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  name: string;
  step_type: WorkflowStepType;
  description: string;
  associated_node_id?: string | null;
  inputs: string[];
  outputs: string[];
  calls: string[];
  evidence?: SourceEvidence | null;
  metadata?: Record<string, any>;
}

export interface WorkflowTransition {
  id: string;
  source: string;
  target: string;
  transition_type: WorkflowTransitionType;
  label: string;
  condition?: string | null;
  evidence?: SourceEvidence | null;
}

export interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  metadata?: Record<string, any>;
}

export interface WorkflowsResponse {
  workflows: WorkflowItem[];
}


