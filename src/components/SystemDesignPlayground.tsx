import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Desktop,
  Database,
  Globe,
  Users,
  Factory,
  Add,
  Delete,
  Close,
  Link,
  Grid,
  Refresh,
  TrendUp,
  Check,
  Maximize,
} from '@veasnawt/vicons';
import type {
  ArchitectureConfig,
  SimulationMetrics,
} from '../types/simulation';
import type {
  PlaygroundNodeType,
  NodePosition,
  WireConnection,
  DraggingWire,
} from '../types/playground';

interface SystemDesignPlaygroundProps {
  config: ArchitectureConfig;
  onChangeConfig: (newConfig: ArchitectureConfig) => void;
  currentRps: number;
  metrics: SimulationMetrics | null;
  onSelectNode: (nodeType: 'server' | 'database' | 'cache' | 'queue' | 'loadBalancer', nodeId?: string) => void;
  onOpenAddComponentModal: () => void;
  onDeleteServer: (serverId: string) => void;
  onAddServer: (role: 'api_server' | 'worker') => void;
  onSelectStarterTemplate?: (templateId: string) => void;
}

const getNodeDimensions = (type: PlaygroundNodeType): { width: number; height: number } => {
  switch (type) {
    case 'ingress':
      return { width: 210, height: 105 };
    case 'loadBalancer':
      return { width: 210, height: 95 };
    case 'server':
      return { width: 240, height: 165 };
    case 'database':
      return { width: 220, height: 135 };
    case 'cache':
      return { width: 205, height: 115 };
    case 'queue':
      return { width: 215, height: 105 };
    case 'worker':
      return { width: 220, height: 110 };
    default:
      return { width: 210, height: 120 };
  }
};

// Generate optimal, non-overlapping whiteboard coordinates for all nodes
const generateDefaultPositions = (
  config: ArchitectureConfig,
  containerWidth: number = 1400,
  containerHeight: number = 720
): Record<string, NodePosition> => {
  const positions: Record<string, NodePosition> = {};
  const webServers = config.servers.filter((s) => s.role !== 'worker');
  const workers = config.servers.filter((s) => s.role === 'worker');
  const lbEnabled = config.loadBalancer.enabled && webServers.length > 1;

  // 1. Calculate horizontal tier columns with collision-free spacing
  // Card widths: Ingress=210, LB=210, Server=240, Services=220, Worker=220
  const INGRESS_W = 210;
  const LB_W = 210;
  const SERVER_W = 240;
  const SERVICES_W = 220;
  const WORKER_W = 220;

  const hasWorkers = workers.length > 0;
  const useTwoServerCols = webServers.length >= 4;

  let tierGap = 100;
  const totalOccupiedWidth =
    INGRESS_W +
    (lbEnabled ? LB_W + tierGap : 0) +
    tierGap +
    (useTwoServerCols ? SERVER_W * 2 + 40 : SERVER_W) +
    tierGap +
    SERVICES_W +
    (hasWorkers ? tierGap + WORKER_W : 0);

  if (containerWidth > 0 && containerWidth < totalOccupiedWidth + 100) {
    tierGap = Math.max(65, Math.floor((containerWidth - (totalOccupiedWidth - tierGap * 4)) / 4));
  } else if (containerWidth >= 1600) {
    tierGap = 120;
  }

  const startX = 40;
  const ingressX = startX;

  let currentX = ingressX + INGRESS_W + tierGap;

  // Load Balancer X
  const lbX = currentX;
  if (lbEnabled) {
    currentX += LB_W + tierGap;
  }

  // Web Servers X
  const serverCol1X = currentX;
  const serverCol2X = serverCol1X + SERVER_W + 40;
  const serverRightX = useTwoServerCols ? serverCol2X + SERVER_W : serverCol1X + SERVER_W;

  // Services Tier X (Database, Cache, Queue)
  const servicesX = serverRightX + tierGap;
  const servicesRightX = servicesX + SERVICES_W;

  // Worker Tier X
  const workerCol1X = servicesRightX + tierGap;
  const workerCol2X = workerCol1X + WORKER_W + 40;

  // 2. Vertical layout calculations
  const SERVER_H = 165;
  const SERVER_GAP_Y = 35; // 35px gap ensures zero overlap even with badges/warnings
  const serverStepY = SERVER_H + SERVER_GAP_Y; // 200px

  let webServerHeight = 0;
  if (useTwoServerCols) {
    const rows = Math.ceil(webServers.length / 2);
    webServerHeight = rows * SERVER_H + (rows - 1) * SERVER_GAP_Y;
  } else {
    webServerHeight = Math.max(1, webServers.length) * SERVER_H + Math.max(0, webServers.length - 1) * SERVER_GAP_Y;
  }

  // Visual center of the cluster
  const canvasCenterY = Math.max(220, Math.min(Math.round(containerHeight / 2), 340));
  const clusterCenterY = webServers.length <= 1 ? canvasCenterY : Math.max(240, Math.round(webServerHeight / 2) + 40);

  // Position Ingress and Load Balancer centered with the cluster
  positions['ingress'] = {
    x: ingressX,
    y: Math.max(30, Math.round(clusterCenterY - 105 / 2)),
  };

  positions['loadBalancer'] = {
    x: lbX,
    y: Math.max(30, Math.round(clusterCenterY - 95 / 2)),
  };

  // Position Web Servers with guaranteed zero overlap
  if (webServers.length === 0) {
    // Zero state: no web servers
  } else if (webServers.length === 1) {
    positions[webServers[0].id] = {
      x: serverCol1X,
      y: Math.max(30, Math.round(clusterCenterY - SERVER_H / 2)),
    };
  } else if (useTwoServerCols) {
    // 2-column grid layout for 4+ servers
    const startY = Math.max(30, Math.round(clusterCenterY - webServerHeight / 2));
    webServers.forEach((s, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      positions[s.id] = {
        x: col === 0 ? serverCol1X : serverCol2X,
        y: startY + row * serverStepY,
      };
    });
  } else {
    // 1-column layout for 2 or 3 servers
    const startY = Math.max(30, Math.round(clusterCenterY - webServerHeight / 2));
    webServers.forEach((s, idx) => {
      positions[s.id] = {
        x: serverCol1X,
        y: startY + idx * serverStepY,
      };
    });
  }

  // Position Services Tier (Cache, Database, Queue) - ZERO OVERLAP
  const CACHE_H = 115;
  const DB_H = 135;
  const QUEUE_H = 105;
  const SERVICE_GAP_Y = 35; // 35px clear vertical separation between cards

  const hasCache = config.cache.enabled;
  const hasQueue = config.queue.enabled;

  if (hasCache && hasQueue) {
    // All 3 services active
    const totalServicesH = CACHE_H + SERVICE_GAP_Y + DB_H + SERVICE_GAP_Y + QUEUE_H;
    const servicesStartY = Math.max(30, Math.round(clusterCenterY - totalServicesH / 2));

    positions['cache'] = { x: servicesX, y: servicesStartY };
    positions['database'] = { x: servicesX, y: servicesStartY + CACHE_H + SERVICE_GAP_Y };
    positions['queue'] = { x: servicesX, y: servicesStartY + CACHE_H + SERVICE_GAP_Y + DB_H + SERVICE_GAP_Y };
  } else if (hasCache) {
    // Cache and Database active
    const totalServicesH = CACHE_H + SERVICE_GAP_Y + DB_H;
    const servicesStartY = Math.max(40, Math.round(clusterCenterY - totalServicesH / 2));

    positions['cache'] = { x: servicesX, y: servicesStartY };
    positions['database'] = { x: servicesX, y: servicesStartY + CACHE_H + SERVICE_GAP_Y };
    positions['queue'] = { x: servicesX, y: servicesStartY + totalServicesH + SERVICE_GAP_Y };
  } else if (hasQueue) {
    // Database and Queue active
    const totalServicesH = DB_H + SERVICE_GAP_Y + QUEUE_H;
    const servicesStartY = Math.max(50, Math.round(clusterCenterY - totalServicesH / 2));

    positions['cache'] = { x: servicesX, y: Math.max(20, servicesStartY - CACHE_H - SERVICE_GAP_Y) };
    positions['database'] = { x: servicesX, y: servicesStartY };
    positions['queue'] = { x: servicesX, y: servicesStartY + DB_H + SERVICE_GAP_Y };
  } else {
    // Only Database active
    positions['database'] = { x: servicesX, y: Math.max(40, Math.round(clusterCenterY - DB_H / 2)) };
    positions['cache'] = { x: servicesX, y: 40 };
    positions['queue'] = { x: servicesX, y: Math.max(40, Math.round(clusterCenterY - DB_H / 2)) + DB_H + SERVICE_GAP_Y };
  }

  // Position Workers Tier - Aligned with Message Queue and ZERO OVERLAP
  const WORKER_H = 110;
  const WORKER_GAP_Y = 25;
  const workerStepY = WORKER_H + WORKER_GAP_Y;

  const queueY = positions['queue'] ? positions['queue'].y : Math.max(60, clusterCenterY);

  if (workers.length === 1) {
    positions[workers[0].id] = {
      x: workerCol1X,
      y: queueY,
    };
  } else if (workers.length >= 4) {
    const workerStartY = Math.max(40, queueY - 40);
    workers.forEach((w, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      positions[w.id] = {
        x: col === 0 ? workerCol1X : workerCol2X,
        y: workerStartY + row * workerStepY,
      };
    });
  } else {
    const workerStartY = workers.length === 2 ? Math.max(30, queueY - 40) : Math.max(30, queueY - 70);
    workers.forEach((w, idx) => {
      positions[w.id] = {
        x: workerCol1X,
        y: workerStartY + idx * workerStepY,
      };
    });
  }

  return positions;
};

// Generate default optimal system wires
const generateDefaultConnections = (config: ArchitectureConfig): WireConnection[] => {
  const conns: WireConnection[] = [];
  const webServers = config.servers.filter((s) => s.role !== 'worker');
  const workers = config.servers.filter((s) => s.role === 'worker');
  const lbEnabled = config.loadBalancer.enabled && webServers.length > 1;

  if (lbEnabled) {
    conns.push({
      id: 'wire-ingress-lb',
      fromId: 'ingress',
      toId: 'loadBalancer',
      fromHandle: 'right',
      toHandle: 'left',
      protocol: 'HTTPS',
      label: 'Public Traffic',
    });

    webServers.forEach((s) => {
      conns.push({
        id: `wire-lb-${s.id}`,
        fromId: 'loadBalancer',
        toId: s.id,
        fromHandle: 'right',
        toHandle: 'left',
        protocol: 'TCP / HTTP',
      });
    });
  } else {
    webServers.forEach((s) => {
      conns.push({
        id: `wire-ingress-${s.id}`,
        fromId: 'ingress',
        toId: s.id,
        fromHandle: 'right',
        toHandle: 'left',
        protocol: 'Direct Ingress',
      });
    });
  }

  webServers.forEach((s) => {
    conns.push({
      id: `wire-${s.id}-db`,
      fromId: s.id,
      toId: 'database',
      fromHandle: 'right',
      toHandle: 'left',
      protocol: 'SQL',
    });

    if (config.cache.enabled) {
      conns.push({
        id: `wire-${s.id}-cache`,
        fromId: s.id,
        toId: 'cache',
        fromHandle: 'right',
        toHandle: 'left',
        protocol: 'RESP',
      });
    }

    if (config.queue.enabled) {
      conns.push({
        id: `wire-${s.id}-queue`,
        fromId: s.id,
        toId: 'queue',
        fromHandle: 'right',
        toHandle: 'left',
        protocol: 'Queue Push',
      });
    }
  });

  if (config.queue.enabled) {
    workers.forEach((w) => {
      conns.push({
        id: `wire-queue-${w.id}`,
        fromId: 'queue',
        toId: w.id,
        fromHandle: 'right',
        toHandle: 'left',
        protocol: 'Worker Pop',
      });
    });
  }

  return conns;
};

export const SystemDesignPlayground: React.FC<SystemDesignPlaygroundProps> = ({
  config,
  onChangeConfig,
  currentRps,
  metrics,
  onSelectNode,
  onOpenAddComponentModal,
  onDeleteServer,
  onAddServer,
  onSelectStarterTemplate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stored node coordinates
  const [positions, setPositions] = useState<Record<string, NodePosition>>(() =>
    generateDefaultPositions(config)
  );

  // Active wire connections
  const [connections, setConnections] = useState<WireConnection[]>(() =>
    generateDefaultConnections(config)
  );

  // Node Dragging State
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);

  // Wire Dragging (creation in progress)
  const [draggingWire, setDraggingWire] = useState<DraggingWire | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Sync wires and node positions whenever components are added, removed, or switched
  const lastConfigNameRef = useRef<string>(config.name);
  useEffect(() => {
    // If a whole new template was selected, re-initialize default layout
    if (lastConfigNameRef.current !== config.name) {
      lastConfigNameRef.current = config.name;
      const rect = containerRef.current?.getBoundingClientRect();
      setPositions(generateDefaultPositions(config, rect?.width, rect?.height));
      setConnections(generateDefaultConnections(config));
      return;
    }

    const validNodeIds = new Set<string>([
      'ingress',
      'database',
      ...(config.loadBalancer.enabled ? ['loadBalancer'] : []),
      ...(config.cache.enabled ? ['cache'] : []),
      ...(config.queue.enabled ? ['queue'] : []),
      ...config.servers.map((s) => s.id),
    ]);

    // Automatically remove lines to any node that was removed
    setConnections((prev) => {
      let valid = prev.filter((c) => validNodeIds.has(c.fromId) && validNodeIds.has(c.toId));

      // If load balancer was disabled and web servers have no ingress connection, wire direct ingress
      const currentWebServers = config.servers.filter((s) => s.role !== 'worker');
      const hasIngressWire = valid.some((c) => c.fromId === 'ingress' && validNodeIds.has(c.toId));
      if (!config.loadBalancer.enabled && currentWebServers.length > 0 && !hasIngressWire) {
        const directWires: WireConnection[] = currentWebServers.map((s) => ({
          id: `wire-ingress-${s.id}`,
          fromId: 'ingress',
          toId: s.id,
          fromHandle: 'right',
          toHandle: 'left',
          protocol: 'Direct Ingress',
        }));
        valid = [...valid, ...directWires];
      }

      if (valid.length !== prev.length) {
        return valid;
      }
      return prev;
    });

    // Automatically clean up coordinates of removed nodes
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (
          !validNodeIds.has(id) &&
          id !== 'ingress' &&
          id !== 'database' &&
          id !== 'loadBalancer' &&
          id !== 'cache' &&
          id !== 'queue'
        ) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [config]);

  // Dynamic position getter with fallback
  const getNodePosition = useCallback(
    (nodeId: string): NodePosition => {
      if (positions[nodeId]) return positions[nodeId];
      const defaults = generateDefaultPositions(config);
      return defaults[nodeId] || { x: 400, y: 200 };
    },
    [positions, config]
  );

  // Handle pointer move over playground canvas
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // 1. Moving node
      if (draggingNode) {
        const deltaX = e.clientX - draggingNode.startMouseX;
        const deltaY = e.clientY - draggingNode.startMouseY;
        const newX = Math.max(10, Math.min(rect.width - 250, draggingNode.startNodeX + deltaX));
        const newY = Math.max(10, Math.min(rect.height - 200, draggingNode.startNodeY + deltaY));

        setPositions((prev) => ({
          ...prev,
          [draggingNode.id]: { x: Math.round(newX), y: Math.round(newY) },
        }));
      }

      // 2. Dragging new wire
      if (draggingWire) {
        setDraggingWire((prev) =>
          prev ? { ...prev, currentX, currentY } : null
        );
      }
    },
    [draggingNode, draggingWire]
  );

  // Handle pointer up (finish node drag or finish wire connection)
  const handlePointerUp = useCallback(() => {
    if (draggingNode) {
      setDraggingNode(null);
    }

    if (draggingWire) {
      if (hoveredNodeId && hoveredNodeId !== draggingWire.fromNodeId) {
        const newWireId = `wire-${draggingWire.fromNodeId}-${hoveredNodeId}-${Date.now().toString().slice(-4)}`;
        const alreadyExists = connections.some(
          (c) => c.fromId === draggingWire.fromNodeId && c.toId === hoveredNodeId
        );

        if (!alreadyExists) {
          const fromPos = getNodePosition(draggingWire.fromNodeId);
          const toPos = getNodePosition(hoveredNodeId);

          let toHandle: 'left' | 'top' | 'right' | 'bottom' = 'left';
          if (hoveredNodeId === 'queue') {
            if (draggingWire.fromHandle === 'bottom' || Math.abs(fromPos.x - toPos.x) < 80) {
              toHandle = 'top';
            } else {
              toHandle = 'left';
            }
          }

          setConnections((prev) => [
            ...prev,
            {
              id: newWireId,
              fromId: draggingWire.fromNodeId,
              toId: hoveredNodeId,
              fromHandle: draggingWire.fromHandle,
              toHandle,
              protocol: 'Connected',
            },
          ]);
        }
      }
      setDraggingWire(null);
    }
  }, [draggingNode, draggingWire, hoveredNodeId, connections, getNodePosition]);

  // Start dragging a node
  const startDragNode = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const pos = getNodePosition(nodeId);
    setDraggingNode({
      id: nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: pos.x,
      startNodeY: pos.y,
    });
  };

  // Start dragging a wire from output port handle
  const startWireDrag = (
    e: React.PointerEvent,
    fromNodeId: string,
    fromHandle: 'top' | 'right' | 'bottom' | 'left',
    nodeType: PlaygroundNodeType
  ) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const start = getPortCoords(fromNodeId, nodeType, fromHandle);

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDraggingWire({
      fromNodeId,
      fromHandle,
      startX: start.x,
      startY: start.y,
      currentX: mouseX,
      currentY: mouseY,
    });
  };

  // Delete a wire connection
  const deleteWire = (wireId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== wireId));
  };

  // Delete a node and immediately purge all wires connected to or from it
  const handleDeleteNode = (nodeId: string) => {
    setConnections((prev) => prev.filter((c) => c.fromId !== nodeId && c.toId !== nodeId));
    setPositions((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    onDeleteServer(nodeId);
  };

  // Auto Arrange Nodes to Clean Whiteboard Layout
  const handleAutoArrange = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    setPositions(generateDefaultPositions(config, rect?.width, rect?.height));
    setConnections(generateDefaultConnections(config));
  };

  // Reset Connections to standard
  const handleResetWires = () => {
    setConnections(generateDefaultConnections(config));
  };

  // Drop component from palette directly onto canvas coordinate
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropX = Math.round(e.clientX - rect.left);
    const dropY = Math.round(e.clientY - rect.top);

    const componentType = e.dataTransfer.getData('application/vsystemsim-type');
    if (!componentType) return;

    if (componentType === 'server') {
      onAddServer('api_server');
    } else if (componentType === 'worker') {
      onAddServer('worker');
    } else if (componentType === 'loadBalancer') {
      onChangeConfig({
        ...config,
        loadBalancer: { ...config.loadBalancer, enabled: !config.loadBalancer.enabled },
      });
    } else if (componentType === 'cache') {
      onChangeConfig({
        ...config,
        cache: { ...config.cache, enabled: !config.cache.enabled },
      });
    } else if (componentType === 'queue') {
      onChangeConfig({
        ...config,
        queue: { ...config.queue, enabled: !config.queue.enabled },
      });
    }

    if (componentType === 'server') {
      const newId = `server-${Date.now().toString().slice(-4)}`;
      setPositions((prev) => ({
        ...prev,
        [newId]: { x: dropX, y: dropY },
      }));
    }
  };

  // Calculate Bezier coordinates for wire
  const getPortCoords = (nodeId: string, nodeType: PlaygroundNodeType, handle: 'left' | 'right' | 'top' | 'bottom') => {
    const pos = getNodePosition(nodeId);
    const dim = getNodeDimensions(nodeType);

    if (handle === 'right') return { x: pos.x + dim.width, y: pos.y + dim.height / 2 };
    if (handle === 'left') return { x: pos.x, y: pos.y + dim.height / 2 };
    if (handle === 'bottom') return { x: pos.x + dim.width / 2, y: pos.y + dim.height };
    return { x: pos.x + dim.width / 2, y: pos.y };
  };

  const getWirePath = (c: WireConnection) => {
    const fromType: PlaygroundNodeType =
      c.fromId === 'ingress'
        ? 'ingress'
        : c.fromId === 'loadBalancer'
        ? 'loadBalancer'
        : c.fromId === 'database'
        ? 'database'
        : c.fromId === 'cache'
        ? 'cache'
        : c.fromId === 'queue'
        ? 'queue'
        : config.servers.find((s) => s.id === c.fromId)?.role === 'worker'
        ? 'worker'
        : 'server';

    const toType: PlaygroundNodeType =
      c.toId === 'loadBalancer'
        ? 'loadBalancer'
        : c.toId === 'database'
        ? 'database'
        : c.toId === 'cache'
        ? 'cache'
        : c.toId === 'queue'
        ? 'queue'
        : config.servers.find((s) => s.id === c.toId)?.role === 'worker'
        ? 'worker'
        : 'server';

    const fromH = c.fromHandle || 'right';
    const toH = c.toHandle || 'left';
    const start = getPortCoords(c.fromId, fromType, fromH);
    const end = getPortCoords(c.toId, toType, toH);

    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const curvature = Math.max(35, Math.min(120, dist * 0.45));

    let cp1x = start.x;
    let cp1y = start.y;
    if (fromH === 'right') cp1x += curvature;
    else if (fromH === 'left') cp1x -= curvature;
    else if (fromH === 'bottom') cp1y += curvature;
    else if (fromH === 'top') cp1y -= curvature;

    let cp2x = end.x;
    let cp2y = end.y;
    if (toH === 'left') cp2x -= curvature;
    else if (toH === 'right') cp2x += curvature;
    else if (toH === 'top') cp2y -= curvature;
    else if (toH === 'bottom') cp2y += curvature;

    return {
      path: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
      midX: (start.x + end.x) / 2,
      midY: (start.y + end.y) / 2,
      start,
      end,
    };
  };

  const webServers = config.servers.filter((s) => s.role !== 'worker');
  const workerServers = config.servers.filter((s) => s.role === 'worker');

  // Traffic pulse speed class based on current RPS
  const flowSpeedClass = currentRps > 1000 ? 'wire-flow-turbo' : currentRps > 300 ? 'wire-flow-fast' : 'wire-flow';

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-40 bg-[#070a12] w-screen h-screen flex flex-col p-2 sm:p-3 overflow-hidden select-none'
          : 'flex-1 w-full h-full min-h-0 flex flex-col gap-2 select-none overflow-hidden'
      }
    >
      {/* 1. TOP PLAYGROUND TOOLBAR & PALETTE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 flex-wrap shadow-lg">
        {/* Component Palette */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Drag to Canvas:
          </span>

          {/* Web Server */}
          <button
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/vsystemsim-type', 'server')}
            onClick={() => onAddServer('api_server')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all hover:scale-102"
            title="Drag onto canvas or click to add Web Server instance"
          >
            <Desktop size={13} className="text-indigo-400" />
            <span>+ Web Server</span>
          </button>

          {/* Load Balancer */}
          <button
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/vsystemsim-type', 'loadBalancer')}
            onClick={() => {
              const nextEnabled = !config.loadBalancer.enabled;
              if (!nextEnabled) {
                setConnections((prev) => prev.filter((c) => c.fromId !== 'loadBalancer' && c.toId !== 'loadBalancer'));
              }
              onChangeConfig({
                ...config,
                loadBalancer: { ...config.loadBalancer, enabled: nextEnabled },
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102 ${
              config.loadBalancer.enabled
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 opacity-70'
            }`}
            title="Toggle Load Balancer (ALB)"
          >
            <Globe size={13} className="text-blue-400" />
            <span>Load Balancer ({config.loadBalancer.enabled ? 'ON' : 'OFF'})</span>
          </button>

          {/* Redis Cache */}
          <button
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/vsystemsim-type', 'cache')}
            onClick={() => {
              const nextEnabled = !config.cache.enabled;
              if (!nextEnabled) {
                setConnections((prev) => prev.filter((c) => c.fromId !== 'cache' && c.toId !== 'cache'));
              }
              onChangeConfig({
                ...config,
                cache: { ...config.cache, enabled: nextEnabled },
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102 ${
              config.cache.enabled
                ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 opacity-70'
            }`}
            title="Toggle In-Memory Redis Cache"
          >
            <Database size={13} className="text-rose-400" />
            <span>Redis Cache ({config.cache.enabled ? 'ON' : 'OFF'})</span>
          </button>

          {/* Queue & Worker */}
          <button
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/vsystemsim-type', 'queue')}
            onClick={() => {
              const nextEnabled = !config.queue.enabled;
              if (!nextEnabled) {
                setConnections((prev) => prev.filter((c) => c.fromId !== 'queue' && c.toId !== 'queue'));
              }
              onChangeConfig({
                ...config,
                queue: { ...config.queue, enabled: nextEnabled },
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102 ${
              config.queue.enabled
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 opacity-70'
            }`}
            title="Toggle Asynchronous BullMQ Message Queue"
          >
            <Factory size={13} className="text-amber-400" />
            <span>BullMQ Queue ({config.queue.enabled ? 'ON' : 'OFF'})</span>
          </button>

          {/* Queue Worker */}
          <button
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/vsystemsim-type', 'worker')}
            onClick={() => onAddServer('worker')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all hover:scale-102"
            title="Add dedicated background queue worker"
          >
            <Factory size={13} className="text-cyan-400" />
            <span>+ Worker</span>
          </button>
        </div>

        {/* Action buttons: Auto-arrange, Add Custom Tech, Fullscreen */}
        <div className="flex items-center gap-2">
          {isFullscreen && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
              <span className="font-bold">{currentRps} RPS</span>
              <span className="text-slate-600">•</span>
              <span>{config.servers.length} Servers</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenAddComponentModal}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
            title="Add web-verified custom tech stack or hosting provider"
          >
            <Add size={13} />
            <span>Custom Tech</span>
          </button>

          <button
            type="button"
            onClick={handleAutoArrange}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Cleanly arrange nodes into whiteboard layout"
          >
            <Grid size={13} />
            <span>Auto Layout</span>
          </button>

          <button
            type="button"
            onClick={handleResetWires}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Reconnect optimal system wiring"
          >
            <Refresh size={13} />
            <span>Reset Wires</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
              isFullscreen
                ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30 font-bold'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen Mode'}
          >
            {isFullscreen ? <Close size={13} /> : <Maximize size={13} />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE INTERACTIVE PLAYGROUND CANVAS */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        className="relative w-full flex-1 min-h-0 bg-[#070a12] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl playground-canvas-grid"
      >
        {/* Subtle Canvas Watermark & Instruction Banner */}
        <div className="absolute bottom-3 left-4 pointer-events-none text-[11px] text-slate-500 flex items-center gap-2 z-10 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/60 backdrop-blur-xs">
          <Link size={14} className="text-indigo-400" />
          <span>Drag nodes freely • Drag right ports (●) to wire components together • Hover wire to disconnect</span>
        </div>

        {/* Live Simulation Stats HUD on canvas bottom right */}
        {metrics && (
          <div className="absolute bottom-3 right-4 pointer-events-none text-[11px] text-slate-400 font-mono flex items-center gap-2 z-10 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/60 backdrop-blur-xs">
            <span className="text-indigo-400 font-bold">{currentRps} RPS</span>
            <span className="text-slate-600">•</span>
            <span>{(metrics.totalRequestsCount ?? 0).toLocaleString()} Reqs</span>
          </div>
        )}

        {/* ZERO-STATE HERO IF NO WEB SERVERS PRESENT */}
        {webServers.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950/70 backdrop-blur-xs">
            <button
              onClick={onOpenAddComponentModal}
              className="relative group w-20 h-20 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer mb-4"
              title="Add component to playground"
            >
              <Add size={36} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">System Design Playground</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Add your first web server or pick an instant architecture below to drag, drop, and wire components together.
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[
                { id: 'starter-node-pg', label: 'Node.js + Postgres' },
                { id: 'starter-bun-fly', label: 'Bun + Fly.io' },
                { id: 'starter-go-hetzner', label: 'Golang Cluster' },
                { id: 'starter-rust-axum', label: 'Rust Axum + Queue' },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => onSelectStarterTemplate && onSelectStarterTemplate(tmpl.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-indigo-300 border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <TrendUp size={12} className="text-indigo-400" />
                  <span>{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. SVG CONNECTION WIRES OVERLAY */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <linearGradient id="wire-healthy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient id="wire-amber-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Render All Existing Connections (filtering out any nodes that were removed) */}
          {connections
            .filter((conn) => {
              const validNodeIds = new Set<string>([
                'ingress',
                'database',
                ...(config.loadBalancer.enabled ? ['loadBalancer'] : []),
                ...(config.cache.enabled ? ['cache'] : []),
                ...(config.queue.enabled ? ['queue'] : []),
                ...config.servers.map((s) => s.id),
              ]);
              return validNodeIds.has(conn.fromId) && validNodeIds.has(conn.toId);
            })
            .map((conn) => {
            const wireData = getWirePath(conn);
            const isTargetServer = config.servers.some((s) => s.id === conn.toId);
            const targetServer = isTargetServer ? config.servers.find((s) => s.id === conn.toId) : null;
            const isCrashed = targetServer?.status === 'crashing';
            const isHighCpu = (targetServer?.cpuUtilization ?? 0) > 85;

            const strokeColor = isCrashed
              ? '#ef4444'
              : isHighCpu
              ? 'url(#wire-amber-gradient)'
              : 'url(#wire-healthy-gradient)';

            return (
              <g key={conn.id} className="group pointer-events-auto cursor-pointer">
                {/* Wide invisible path for comfortable click/hover */}
                <path
                  d={wireData.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                  onClick={() => deleteWire(conn.id)}
                />

                {/* Glow layer */}
                <path
                  d={wireData.path}
                  fill="none"
                  stroke={isCrashed ? '#ef4444' : '#6366f1'}
                  strokeWidth={5}
                  strokeOpacity={0.25}
                  className="group-hover:stroke-opacity-60 transition-opacity"
                />

                {/* Main animated wire */}
                <path
                  d={wireData.path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2}
                  className={isCrashed ? '' : flowSpeedClass}
                />

                {/* Center Badge on Wire with Protocol, Latency and Delete Action */}
                {(() => {
                  let wireLatencyStr = `${config.traffic.networkLatencyMs ?? 20}ms`;
                  if (conn.fromId === 'ingress') {
                    wireLatencyStr = `${config.traffic.networkLatencyMs ?? 20}ms`;
                  } else if (conn.toId === 'database') {
                    wireLatencyStr = `${config.database.queryLatencyMs ?? 2.8}ms`;
                  } else if (conn.toId === 'cache') {
                    wireLatencyStr = `${config.cache.latencyMs ?? 0.6}ms`;
                  } else if (conn.toId === 'queue') {
                    wireLatencyStr = '2ms';
                  } else if (conn.fromId === 'queue') {
                    const queueWaitMs = Math.round((config.queue.queueDepth / Math.max(1, config.queue.processingRate)) * 1000);
                    wireLatencyStr = `${queueWaitMs}ms`;
                  } else if (conn.fromId === 'loadBalancer') {
                    wireLatencyStr = '1.5ms';
                  }

                  return (
                    <foreignObject
                      x={wireData.midX - 44}
                      y={wireData.midY - 12}
                      width={88}
                      height={24}
                      className="overflow-visible"
                    >
                      <div
                        onClick={() => deleteWire(conn.id)}
                        className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-slate-700/80 text-[9px] font-mono text-slate-300 shadow-md group-hover:border-rose-500 group-hover:text-rose-300 transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
                        title={`Click to disconnect wire. Latency: ${wireLatencyStr}`}
                      >
                        <span className="truncate">{conn.protocol || 'Link'}</span>
                        <span className="text-amber-300 font-semibold text-[8px]">{wireLatencyStr}</span>
                        <Close size={9} className="hidden group-hover:inline text-rose-400 shrink-0" />
                      </div>
                    </foreignObject>
                  );
                })()}
              </g>
            );
          })}

          {/* Render Active Dragging Wire in Progress */}
          {draggingWire && (() => {
            const fromH = draggingWire.fromHandle || 'right';
            const dist = Math.hypot(
              draggingWire.currentX - draggingWire.startX,
              draggingWire.currentY - draggingWire.startY
            );
            const curvature = Math.max(30, Math.min(100, dist * 0.4));
            let cp1x = draggingWire.startX;
            let cp1y = draggingWire.startY;
            if (fromH === 'right') cp1x += curvature;
            else if (fromH === 'left') cp1x -= curvature;
            else if (fromH === 'bottom') cp1y += curvature;
            else if (fromH === 'top') cp1y -= curvature;

            return (
              <g>
                <path
                  d={`M ${draggingWire.startX} ${draggingWire.startY} C ${cp1x} ${cp1y}, ${draggingWire.currentX} ${draggingWire.currentY}, ${draggingWire.currentX} ${draggingWire.currentY}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  className="animate-pulse"
                />
                <circle
                  cx={draggingWire.currentX}
                  cy={draggingWire.currentY}
                  r={5}
                  fill="#38bdf8"
                  className="animate-ping"
                />
              </g>
            );
          })()}
        </svg>

        {/* 4. DRAGGABLE NODE CARDS */}

        {/* NODE: INGRESS (USER TRAFFIC) */}
        {(() => {
          const ingressPos = getNodePosition('ingress');
          const dim = getNodeDimensions('ingress');
          return (
            <div
              style={{
                transform: `translate3d(${ingressPos.x}px, ${ingressPos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, 'ingress')}
              className="absolute z-20 bg-slate-900/95 border border-indigo-500/40 hover:border-indigo-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Users size={14} className="text-indigo-400" />
                    <span>Inbound Traffic</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                    {config.traffic.pattern}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mb-0.5">
                  {currentRps} <span className="text-[10px] text-slate-400 font-normal">RPS</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Base: {config.traffic.baseRps} RPS</span>
                  <span className="text-amber-300 font-mono font-semibold">
                    {config.traffic.networkLatencyMs ?? 20}ms
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-slate-500 font-mono truncate">
                p50: {metrics?.p50LatencyMs ?? config.traffic.networkLatencyMs ?? 20}ms (p95: {metrics?.p95LatencyMs ?? (config.traffic.networkLatencyMs ?? 20) * 2}ms)
              </div>

              {/* Right Output Port Handle */}
              <div
                onPointerDown={(e) => startWireDrag(e, 'ingress', 'right', 'ingress')}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-md cursor-crosshair hover:scale-130 transition-transform flex items-center justify-center text-white"
                title="Drag to connect to Load Balancer or Server"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          );
        })()}

        {/* NODE: LOAD BALANCER */}
        {config.loadBalancer.enabled && (() => {
          const lbPos = getNodePosition('loadBalancer');
          const dim = getNodeDimensions('loadBalancer');
          return (
            <div
              style={{
                transform: `translate3d(${lbPos.x}px, ${lbPos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, 'loadBalancer')}
              onPointerEnter={() => setHoveredNodeId('loadBalancer')}
              onPointerLeave={() => setHoveredNodeId(null)}
              className="absolute z-20 bg-slate-900/95 border border-blue-500/40 hover:border-blue-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group flex flex-col justify-between"
            >
              {/* Left Input Handle */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Globe size={14} className="text-blue-400" />
                    <span>Load Balancer</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode('loadBalancer');
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-mono cursor-pointer"
                  >
                    Config
                  </button>
                </div>
                <div className="text-xs text-slate-300 capitalize font-medium mb-0.5 truncate">
                  Algo: {config.loadBalancer.algorithm.replace('_', ' ')}
                </div>
              </div>
              <div className="text-[10px] text-slate-400">
                Routes to: <strong className="text-slate-200">{webServers.length} Servers</strong>
              </div>

              {/* Right Output Handle */}
              <div
                onPointerDown={(e) => startWireDrag(e, 'loadBalancer', 'right', 'loadBalancer')}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-900 shadow-md cursor-crosshair hover:scale-130 transition-transform flex items-center justify-center text-white"
                title="Drag to wire to Web Servers"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          );
        })()}

        {/* NODES: WEB & API SERVERS */}
        {webServers.map((server) => {
          const isCrashing = server.status === 'crashing';
          const isDegraded = server.status === 'degraded';
          const pos = getNodePosition(server.id);
          const dim = getNodeDimensions('server');
          const verifiedBadge = server.verifiedInfo ? (
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-[85px] inline-flex items-center gap-0.5">
              <Check size={9} className="text-emerald-400 shrink-0" />
              <span className="truncate">{server.verifiedInfo.name}</span>
            </span>
          ) : (
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate max-w-[85px]">
              {server.customTechName || server.techStack}
            </span>
          );

          return (
            <div
              key={server.id}
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, server.id)}
              onPointerEnter={() => setHoveredNodeId(server.id)}
              onPointerLeave={() => setHoveredNodeId(null)}
              className={`absolute z-20 bg-slate-900/95 border rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group transition-colors flex flex-col justify-between ${
                isCrashing
                  ? 'border-rose-500 ring-1 ring-rose-500 shadow-rose-950/50'
                  : isDegraded
                  ? 'border-amber-500/50'
                  : 'border-slate-800 hover:border-indigo-400'
              }`}
            >
              {/* Left Input Port */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Desktop size={13} className="text-indigo-400 shrink-0" />
                    <span className="font-mono text-xs font-bold text-white truncate">{server.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {verifiedBadge}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(server.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                      title="Remove instance"
                    >
                      <Delete size={11} />
                    </button>
                  </div>
                </div>

                {/* Hardware Specs */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>{server.vCpu} vCPU • {server.ramGb}GB</span>
                  <span className="uppercase text-[9px] text-slate-500">{server.customProviderName || server.provider}</span>
                </div>

                {/* CPU Bar */}
                <div className="space-y-0.5 text-[10px] mb-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPU</span>
                    <span className={server.cpuUtilization > 85 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {server.cpuUtilization}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        server.cpuUtilization > 85 ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${server.cpuUtilization}%` }}
                    />
                  </div>
                </div>

                {/* RAM Bar */}
                <div className="space-y-0.5 text-[10px] mb-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">RAM</span>
                    <span className="text-slate-200">{server.ramUsedMb}MB ({server.ramUtilization}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        server.ramUtilization > 90 ? 'bg-rose-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${server.ramUtilization}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status and Conns */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">
                  Conns: <strong className="text-slate-200">{server.activeConnections}</strong>
                  <span className="text-amber-300 font-mono ml-1.5 font-medium">
                    {server.latencyMs ?? (config.traffic.networkLatencyMs ?? 20) + 2}ms
                  </span>
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode('server', server.id);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
                >
                  Tune Specs →
                </span>
              </div>

              {/* Right Output Port Handle (to Database / Cache / Queue) */}
              <div
                onPointerDown={(e) => startWireDrag(e, server.id, 'right', 'server')}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-md cursor-crosshair hover:scale-130 transition-transform flex items-center justify-center text-white"
                title="Drag to wire to Database, Cache, or Queue"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Bottom Output Port Handle (to Queue) */}
              <div
                onPointerDown={(e) => startWireDrag(e, server.id, 'bottom', 'server')}
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 shadow-md cursor-crosshair hover:scale-130 transition-transform flex items-center justify-center text-white"
                title="Drag to wire downwards to Message Queue"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          );
        })}

        {/* NODE: DATABASE */}
        {(() => {
          const dbPos = getNodePosition('database');
          const dim = getNodeDimensions('database');
          return (
            <div
              style={{
                transform: `translate3d(${dbPos.x}px, ${dbPos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, 'database')}
              onPointerEnter={() => setHoveredNodeId('database')}
              onPointerLeave={() => setHoveredNodeId(null)}
              className="absolute z-20 bg-slate-900/95 border border-emerald-500/40 hover:border-emerald-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group flex flex-col justify-between"
            >
              {/* Left Input Port */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Database size={14} className="text-emerald-400" />
                    <span>Database ({config.database.engine.toUpperCase()})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode('database');
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
                  >
                    Config
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {config.database.vCpu} vCPU • {config.database.ramGb}GB RAM ({config.database.provider.toUpperCase()})
                </div>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Queries:</span>
                  <span className="text-slate-200 font-medium">{config.database.queriesPerSecond} QPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Query Latency:</span>
                  <span className="text-amber-300 font-mono font-medium">{config.database.queryLatencyMs ?? 2.5}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pool Saturation:</span>
                  <span className="text-emerald-400 font-medium">{config.database.connectionPoolUtilization}%</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* NODE: REDIS CACHE */}
        {config.cache.enabled && (() => {
          const cachePos = getNodePosition('cache');
          const dim = getNodeDimensions('cache');
          return (
            <div
              style={{
                transform: `translate3d(${cachePos.x}px, ${cachePos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, 'cache')}
              onPointerEnter={() => setHoveredNodeId('cache')}
              onPointerLeave={() => setHoveredNodeId(null)}
              className="absolute z-20 bg-slate-900/95 border border-rose-500/40 hover:border-rose-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group flex flex-col justify-between"
            >
              {/* Left Input Port */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Database size={14} className="text-rose-400" />
                    <span>Redis Cache</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode('cache');
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
                  >
                    Config
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  Memory: {config.cache.memoryGb}GB Allocated
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-400">Hit Ratio:</span>
                  <strong className="text-emerald-400">{config.cache.hitRatio}%</strong>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Lookup Latency:</span>
                  <strong className="text-amber-300 font-mono">{config.cache.latencyMs ?? 0.6}ms</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* NODE: MESSAGE QUEUE (BULLMQ) */}
        {config.queue.enabled && (() => {
          const queuePos = getNodePosition('queue');
          const dim = getNodeDimensions('queue');
          return (
            <div
              style={{
                transform: `translate3d(${queuePos.x}px, ${queuePos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, 'queue')}
              onPointerEnter={() => setHoveredNodeId('queue')}
              onPointerLeave={() => setHoveredNodeId(null)}
              className="absolute z-20 bg-slate-900/95 border border-amber-500/40 hover:border-amber-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group flex flex-col justify-between"
            >
              {/* Top Input Port (from Server above) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Left Input Port (from Server to the left) */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Factory size={14} className="text-amber-400" />
                    <span>BullMQ Queue</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode('queue');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono cursor-pointer"
                  >
                    Config
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  Queue Depth: <strong className="text-amber-400">{config.queue.queueDepth} jobs</strong>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Rate: <strong className="text-slate-200">{config.queue.processingRate}/sec</strong></span>
                <span className="text-amber-300 font-mono">
                  Wait: {Math.round((config.queue.queueDepth / Math.max(1, config.queue.processingRate)) * 1000)}ms
                </span>
              </div>

              {/* Right Output Port (to Workers) */}
              <div
                onPointerDown={(e) => startWireDrag(e, 'queue', 'right', 'queue')}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 shadow-md cursor-crosshair hover:scale-130 transition-transform flex items-center justify-center text-white"
                title="Drag to wire to Background Workers"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          );
        })()}

        {/* NODES: QUEUE WORKERS */}
        {workerServers.map((worker) => {
          const pos = getNodePosition(worker.id);
          const dim = getNodeDimensions('worker');
          return (
            <div
              key={worker.id}
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                width: dim.width,
                height: dim.height,
              }}
              onPointerDown={(e) => startDragNode(e, worker.id)}
              onPointerEnter={() => setHoveredNodeId(worker.id)}
              onPointerLeave={() => setHoveredNodeId(null)}
              className="absolute z-20 bg-slate-900/95 border border-cyan-500/40 hover:border-cyan-400 rounded-xl p-2.5 shadow-xl cursor-grab active:cursor-grabbing group flex flex-col justify-between"
            >
              {/* Left Input Port */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-900 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                    <Factory size={13} className="text-cyan-400 shrink-0" />
                    <span className="font-mono truncate">{worker.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(worker.id);
                    }}
                    className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                  >
                    <Delete size={11} />
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 mb-1">
                  {worker.vCpu} vCPU • {(worker.customTechName || worker.verifiedInfo?.name || worker.techStack).toUpperCase()}
                </div>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Worker CPU:</span>
                  <span className="text-cyan-300 font-bold">{worker.cpuUtilization}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${worker.cpuUtilization}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemDesignPlayground;
