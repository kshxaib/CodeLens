import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
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

interface TraceContextType {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  
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

const TraceContext = createContext<TraceContextType | undefined>(undefined);

export const TraceProvider: React.FC<{
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  children: ReactNode;
}> = ({ repositoryId, currentView, children }) => {
  // Feature 1
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceNodeResponse | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  // Feature 2
  const [startNodeId, setStartNodeId] = useState<string>('');
  const [endNodeId, setEndNodeId] = useState<string>('');
  const [pathData, setPathData] = useState<FindPathResponse | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [highlightOnlyPath, setHighlightOnlyPath] = useState(true);

  // Feature 3
  const [isPathPlaying, setIsPathPlaying] = useState(false);
  const [pathStepIndex, setPathStepIndex] = useState(-1);
  const [pathSpeed, setSpeed] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Feature 4
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [whyData, setWhyData] = useState<WhyRelationshipResponse | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);

  // Feature 5
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [explainData, setExplainData] = useState<ExplainComponentResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  // Feature 6
  const [impactData, setImpactData] = useState<CalculateImpactResponse | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Feature 7
  const [isChangeImpactOpen, setIsChangeImpactOpen] = useState(false);
  const [changeImpactData, setChangeImpactData] = useState<ChangeImpactResponse | null>(null);
  const [changeImpactLoading, setChangeImpactLoading] = useState(false);

  // Catalogs
  const [viewNodes, setViewNodes] = useState<ViewNodeItem[]>([]);
  const [viewFiles, setViewFiles] = useState<string[]>([]);

  // Dock UI
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'trace' | 'path' | 'impact'>('trace');

  // Clear selections when view changes
  useEffect(() => {
    setTraceData(null);
    setSelectedNodeId(null);
    setPathData(null);
    setStartNodeId('');
    setEndNodeId('');
    setIsPathPlaying(false);
    setPathStepIndex(-1);
    setImpactData(null);
  }, [currentView]);

  // ---------------------------------------------------------------------------
  // Feature 1: Select & Trace Node
  // ---------------------------------------------------------------------------
  const selectTraceNode = useCallback(
    async (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (!nodeId) {
        setTraceData(null);
        setImpactData(null);
        return;
      }
      try {
        setTraceLoading(true);
        setTraceError(null);
        const data = await api.traceNode(repositoryId, nodeId, currentView);
        setTraceData(data);
        setIsPanelOpen(true);
        setActiveTab('trace');
      } catch (err: any) {
        console.error('Failed to trace node:', err);
        setTraceError(err.message || 'Unable to trace node upstream and downstream.');
      } finally {
        setTraceLoading(false);
      }
    },
    [repositoryId, currentView]
  );

  // ---------------------------------------------------------------------------
  // Feature 2: Find Path Between Two Nodes
  // ---------------------------------------------------------------------------
  const findPath = useCallback(
    async (startOverride?: string, endOverride?: string) => {
      const s = startOverride || startNodeId;
      const e = endOverride || endNodeId;
      if (!s || !e) return;

      try {
        setPathLoading(true);
        setPathError(null);
        setIsPathPlaying(false);
        setPathStepIndex(-1);

        const res = await api.findPath(repositoryId, s, e, currentView);
        setPathData(res);
        if (res.found && res.path_nodes && res.path_nodes.length > 0) {
          setPathStepIndex(0);
        }
      } catch (err: any) {
        console.error('Failed to find path:', err);
        setPathError(err.message || 'Path calculation failed.');
      } finally {
        setPathLoading(false);
      }
    },
    [repositoryId, currentView, startNodeId, endNodeId]
  );

  const clearPath = useCallback(() => {
    setPathData(null);
    setIsPathPlaying(false);
    setPathStepIndex(-1);
  }, []);

  // ---------------------------------------------------------------------------
  // Feature 3: Path Animation Player
  // ---------------------------------------------------------------------------
  const playPath = useCallback(() => {
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;
    setIsPathPlaying(true);
    if (pathStepIndex === -1 || pathStepIndex >= pathData.path_nodes.length - 1) {
      setPathStepIndex(0);
    }
  }, [pathData, pathStepIndex]);

  const pausePath = useCallback(() => {
    setIsPathPlaying(false);
  }, []);

  const stepNext = useCallback(() => {
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;
    setIsPathPlaying(false);
    setPathStepIndex((prev) => (prev + 1) % pathData.path_nodes.length);
  }, [pathData]);

  const stepPrev = useCallback(() => {
    if (!pathData || !pathData.path_nodes || pathData.path_nodes.length === 0) return;
    setIsPathPlaying(false);
    setPathStepIndex((prev) => (prev <= 0 ? pathData.path_nodes.length - 1 : prev - 1));
  }, [pathData]);

  const restartPath = useCallback(() => {
    setPathStepIndex(0);
    setIsPathPlaying(true);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isPathPlaying && pathData && pathData.path_nodes && pathData.path_nodes.length > 0) {
      const intervalMs = Math.max(300, Math.round(1400 / pathSpeed));
      timerRef.current = setInterval(() => {
        setPathStepIndex((prev) => {
          if (prev >= pathData.path_nodes.length - 1) {
            return 0; // Loop animation
          }
          return prev + 1;
        });
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPathPlaying, pathData, pathSpeed]);

  // ---------------------------------------------------------------------------
  // Feature 4: Why? (Relationship Verification)
  // ---------------------------------------------------------------------------
  const openWhy = useCallback(
    async (params: { edgeId?: string; source?: string; target?: string }) => {
      try {
        setIsWhyOpen(true);
        setWhyLoading(true);
        const res = await api.whyRelationship(repositoryId, {
          edgeId: params.edgeId,
          source: params.source,
          target: params.target,
          view: currentView,
        });
        setWhyData(res);
      } catch (err: any) {
        console.error('Failed to get relationship justification:', err);
      } finally {
        setWhyLoading(false);
      }
    },
    [repositoryId, currentView]
  );

  const closeWhy = useCallback(() => {
    setIsWhyOpen(false);
    setWhyData(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Feature 5: Explain Component
  // ---------------------------------------------------------------------------
  const openExplain = useCallback(
    async (nodeId: string) => {
      try {
        setIsExplainOpen(true);
        setExplainLoading(true);
        const res = await api.explainComponent(repositoryId, nodeId, currentView);
        setExplainData(res);
      } catch (err: any) {
        console.error('Failed to explain component:', err);
      } finally {
        setExplainLoading(false);
      }
    },
    [repositoryId, currentView]
  );

  const closeExplain = useCallback(() => {
    setIsExplainOpen(false);
    setExplainData(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Feature 6: Calculate Impact
  // ---------------------------------------------------------------------------
  const calculateImpact = useCallback(
    async (nodeId: string) => {
      try {
        setImpactLoading(true);
        const res = await api.calculateImpact(repositoryId, nodeId, currentView);
        setImpactData(res);
      } catch (err: any) {
        console.error('Failed to calculate impact:', err);
      } finally {
        setImpactLoading(false);
      }
    },
    [repositoryId, currentView]
  );

  const clearImpact = useCallback(() => {
    setImpactData(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Feature 7: Change Impact Simulator
  // ---------------------------------------------------------------------------
  const openChangeImpact = useCallback(() => {
    setIsChangeImpactOpen(true);
  }, []);

  const closeChangeImpact = useCallback(() => {
    setIsChangeImpactOpen(false);
  }, []);

  const analyzeChange = useCallback(
    async (params: { filePath?: string; symbol?: string }) => {
      try {
        setChangeImpactLoading(true);
        const res = await api.changeImpact(repositoryId, {
          filePath: params.filePath,
          symbol: params.symbol,
        });
        setChangeImpactData(res);
      } catch (err: any) {
        console.error('Failed to analyze change impact:', err);
      } finally {
        setChangeImpactLoading(false);
      }
    },
    [repositoryId]
  );

  return (
    <TraceContext.Provider
      value={{
        repositoryId,
        currentView,
        selectedNodeId,
        traceData,
        traceLoading,
        traceError,
        selectTraceNode,
        startNodeId,
        endNodeId,
        setStartNodeId,
        setEndNodeId,
        pathData,
        pathLoading,
        pathError,
        findPath,
        clearPath,
        highlightOnlyPath,
        setHighlightOnlyPath,
        isPathPlaying,
        pathStepIndex,
        pathSpeed,
        playPath,
        pausePath,
        stepNext,
        stepPrev,
        restartPath,
        setSpeed,
        isWhyOpen,
        whyData,
        whyLoading,
        openWhy,
        closeWhy,
        isExplainOpen,
        explainData,
        explainLoading,
        openExplain,
        closeExplain,
        impactData,
        impactLoading,
        calculateImpact,
        clearImpact,
        isChangeImpactOpen,
        changeImpactData,
        changeImpactLoading,
        openChangeImpact,
        closeChangeImpact,
        analyzeChange,
        viewNodes,
        setViewNodes,
        viewFiles,
        setViewFiles,
        isPanelOpen,
        setIsPanelOpen,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </TraceContext.Provider>
  );
};

export const useTrace = (): TraceContextType => {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error('useTrace must be used within a TraceProvider');
  }
  return context;
};
