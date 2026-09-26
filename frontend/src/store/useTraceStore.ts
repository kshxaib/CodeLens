import { create } from 'zustand';
import { api } from '../api/client';
import type {
  TraceNodeResponse,
  FindPathResponse,
  WhyRelationshipResponse,
  ExplainComponentResponse,
  CalculateImpactResponse,
  ChangeImpactResponse,
} from '../types';

export interface ViewNodeItem {
  id: string;
  name: string;
  type?: string;
  layer?: string;
}

export interface TraceState {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  initTraceView: (
    repositoryId: number,
    currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle'
  ) => void;

  // Feature 1: Node Trace (Upstream, Current, Downstream)
  selectedNodeId: string | null;
  traceData: TraceNodeResponse | null;
  traceLoading: boolean;
  traceError: string | null;
  selectTraceNode: (nodeId: string | null) => Promise<void>;

  // Feature 2: Pathfinder (Between two nodes)
  startNodeId: string;
  endNodeId: string;
  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string) => void;
  pathData: FindPathResponse | null;
  pathLoading: boolean;
  pathError: string | null;
  findPath: (startId?: string, endId?: string) => Promise<void>;
  clearPath: () => void;
  highlightOnlyPath: boolean;
  setHighlightOnlyPath: (val: boolean) => void;

  // Feature 3: Path Animation
  isPathPlaying: boolean;
  pathStepIndex: number;
  pathSpeed: number;
  playPath: () => void;
  pausePath: () => void;
  stepNext: () => void;
  stepPrev: () => void;
  restartPath: () => void;
  setSpeed: (speed: number) => void;

  // Feature 4: Why? (Relationship Evidence)
  isWhyOpen: boolean;
  whyData: WhyRelationshipResponse | null;
  whyLoading: boolean;
  openWhy: (params: { edgeId?: string; source?: string; target?: string }) => Promise<void>;
  closeWhy: () => void;

  // Feature 5: Explain Component
  isExplainOpen: boolean;
  explainData: ExplainComponentResponse | null;
  explainLoading: boolean;
  openExplain: (nodeId: string) => Promise<void>;
  closeExplain: () => void;

  // Feature 6: Impact Analysis
  impactData: CalculateImpactResponse | null;
  impactLoading: boolean;
  calculateImpact: (nodeId: string) => Promise<void>;
  clearImpact: () => void;

  // Feature 7: Change Impact
  isChangeImpactOpen: boolean;
  changeImpactData: ChangeImpactResponse | null;
  changeImpactLoading: boolean;
  openChangeImpact: () => void;
  closeChangeImpact: () => void;
  analyzeChange: (params: { filePath?: string; symbol?: string }) => Promise<void>;

  // View Catalog
  viewNodes: ViewNodeItem[];
  setViewNodes: (nodes: ViewNodeItem[]) => void;
  viewFiles: string[];
  setViewFiles: (files: string[]) => void;

  // Dock UI visibility
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  activeTab: 'trace' | 'path' | 'impact';
  setActiveTab: (tab: 'trace' | 'path' | 'impact') => void;
}

let pathAnimTimer: ReturnType<typeof setInterval> | null = null;

export const useTraceStore = create<TraceState>((set, get) => ({
  repositoryId: 0,
  currentView: 'architecture',

  initTraceView: (repositoryId, currentView) => {
    const current = get();
    if (current.repositoryId === repositoryId && current.currentView === currentView) {
      return;
    }
    if (pathAnimTimer) {
      clearInterval(pathAnimTimer);
      pathAnimTimer = null;
    }
    set({
      repositoryId,
      currentView,
      selectedNodeId: null,
      traceData: null,
      traceLoading: false,
      traceError: null,
      startNodeId: '',
      endNodeId: '',
      pathData: null,
      pathLoading: false,
      pathError: null,
      isPathPlaying: false,
      pathStepIndex: -1,
      impactData: null,
      impactLoading: false,
      isWhyOpen: false,
      whyData: null,
      isExplainOpen: false,
      explainData: null,
      isChangeImpactOpen: false,
      changeImpactData: null,
    });
  },

  // Feature 1: Node Trace
  selectedNodeId: null,
  traceData: null,
  traceLoading: false,
  traceError: null,

  selectTraceNode: async (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
    if (!nodeId) {
      set({ traceData: null, impactData: null });
      return;
    }
    const { repositoryId, currentView } = get();
    if (!repositoryId) return;

    try {
      set({ traceLoading: true, traceError: null });
      const data = await api.traceNode(repositoryId, nodeId, currentView);
      set({
        traceData: data,
        isPanelOpen: true,
        activeTab: 'trace',
        traceLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to trace node:', err);
      set({
        traceError: err.message || 'Unable to trace node upstream and downstream.',
        traceLoading: false,
      });
    }
  },

  // Feature 2: Pathfinder
  startNodeId: '',
  endNodeId: '',
  pathData: null,
  pathLoading: false,
  pathError: null,
  highlightOnlyPath: true,

  setStartNodeId: (id) => set({ startNodeId: id }),
  setEndNodeId: (id) => set({ endNodeId: id }),
  setHighlightOnlyPath: (val) => set({ highlightOnlyPath: val }),

  findPath: async (startOverride?: string, endOverride?: string) => {
    const s = startOverride || get().startNodeId;
    const e = endOverride || get().endNodeId;
    if (!s || !e) return;
    const { repositoryId, currentView } = get();
    if (!repositoryId) return;

    try {
      get().pausePath();
      set({
        pathLoading: true,
        pathError: null,
        pathStepIndex: -1,
      });

      const res = await api.findPath(repositoryId, s, e, currentView);
      set({
        pathData: res,
        pathLoading: false,
        pathStepIndex: res.found && res.path_nodes && res.path_nodes.length > 0 ? 0 : -1,
      });
    } catch (err: any) {
      console.error('Failed to find path:', err);
      set({
        pathError: err.message || 'Path calculation failed.',
        pathLoading: false,
      });
    }
  },

  clearPath: () => {
    get().pausePath();
    set({
      pathData: null,
      isPathPlaying: false,
      pathStepIndex: -1,
    });
  },

  // Feature 3: Path Animation
  isPathPlaying: false,
  pathStepIndex: -1,
  pathSpeed: 1,

  playPath: () => {
    const { pathData, pathSpeed } = get();
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;

    if (pathAnimTimer) clearInterval(pathAnimTimer);

    let currentIdx = get().pathStepIndex;
    if (currentIdx === -1 || currentIdx >= pathData.path_nodes.length - 1) {
      currentIdx = 0;
    }
    set({ isPathPlaying: true, pathStepIndex: currentIdx });

    const intervalMs = Math.max(300, Math.round(1400 / pathSpeed));
    pathAnimTimer = setInterval(() => {
      const state = get();
      if (
        !state.isPathPlaying ||
        !state.pathData ||
        !state.pathData.path_nodes ||
        state.pathData.path_nodes.length === 0
      ) {
        if (pathAnimTimer) {
          clearInterval(pathAnimTimer);
          pathAnimTimer = null;
        }
        return;
      }
      const nextIdx = (state.pathStepIndex + 1) % state.pathData.path_nodes.length;
      set({ pathStepIndex: nextIdx });
    }, intervalMs);
  },

  pausePath: () => {
    if (pathAnimTimer) {
      clearInterval(pathAnimTimer);
      pathAnimTimer = null;
    }
    set({ isPathPlaying: false });
  },

  stepNext: () => {
    get().pausePath();
    const { pathData, pathStepIndex } = get();
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;
    set({ pathStepIndex: (pathStepIndex + 1) % pathData.path_nodes.length });
  },

  stepPrev: () => {
    get().pausePath();
    const { pathData, pathStepIndex } = get();
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;
    set({ pathStepIndex: pathStepIndex <= 0 ? pathData.path_nodes.length - 1 : pathStepIndex - 1 });
  },

  restartPath: () => {
    set({ pathStepIndex: 0 });
    get().playPath();
  },

  setSpeed: (speed: number) => {
    set({ pathSpeed: speed });
    if (get().isPathPlaying) {
      get().playPath();
    }
  },

  // Feature 4: Why?
  isWhyOpen: false,
  whyData: null,
  whyLoading: false,

  openWhy: async (params: { edgeId?: string; source?: string; target?: string }) => {
    const { repositoryId, currentView } = get();
    if (!repositoryId) return;

    try {
      set({ isWhyOpen: true, whyLoading: true });
      const res = await api.whyRelationship(repositoryId, {
        edgeId: params.edgeId,
        source: params.source,
        target: params.target,
        view: currentView,
      });
      set({ whyData: res, whyLoading: false });
    } catch (err: any) {
      console.error('Failed to get relationship justification:', err);
      set({ whyLoading: false });
    }
  },

  closeWhy: () => {
    set({ isWhyOpen: false, whyData: null });
  },

  // Feature 5: Explain Component
  isExplainOpen: false,
  explainData: null,
  explainLoading: false,

  openExplain: async (nodeId: string) => {
    const { repositoryId, currentView } = get();
    if (!repositoryId) return;

    try {
      set({ isExplainOpen: true, explainLoading: true });
      const res = await api.explainComponent(repositoryId, nodeId, currentView);
      set({ explainData: res, explainLoading: false });
    } catch (err: any) {
      console.error('Failed to explain component:', err);
      set({ explainLoading: false });
    }
  },

  closeExplain: () => {
    set({ isExplainOpen: false, explainData: null });
  },

  // Feature 6: Impact Analysis
  impactData: null,
  impactLoading: false,

  calculateImpact: async (nodeId: string) => {
    const { repositoryId, currentView } = get();
    if (!repositoryId) return;

    try {
      set({ impactLoading: true });
      const res = await api.calculateImpact(repositoryId, nodeId, currentView);
      set({ impactData: res, impactLoading: false });
    } catch (err: any) {
      console.error('Failed to calculate impact:', err);
      set({ impactLoading: false });
    }
  },

  clearImpact: () => {
    set({ impactData: null });
  },

  // Feature 7: Change Impact
  isChangeImpactOpen: false,
  changeImpactData: null,
  changeImpactLoading: false,

  openChangeImpact: () => {
    set({ isChangeImpactOpen: true });
  },

  closeChangeImpact: () => {
    set({ isChangeImpactOpen: false });
  },

  analyzeChange: async (params: { filePath?: string; symbol?: string }) => {
    const { repositoryId } = get();
    if (!repositoryId) return;

    try {
      set({ changeImpactLoading: true });
      const res = await api.changeImpact(repositoryId, {
        filePath: params.filePath,
        symbol: params.symbol,
      });
      set({ changeImpactData: res, changeImpactLoading: false });
    } catch (err: any) {
      console.error('Failed to analyze change impact:', err);
      set({ changeImpactLoading: false });
    }
  },

  // Catalogs & Dock UI
  viewNodes: [],
  setViewNodes: (nodes) => set({ viewNodes: nodes }),
  viewFiles: [],
  setViewFiles: (files) => set({ viewFiles: files }),

  isPanelOpen: true,
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),
  activeTab: 'trace',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
