import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ArchitectureCanvas } from './components/ArchitectureCanvas';
import { SystemDesignPlayground } from './components/SystemDesignPlayground';
import { NodeConfigModal } from './components/NodeConfigModal';
import { AddComponentModal } from './components/AddComponentModal';
import {
  computeStep,
  calculateTrafficRps,
} from './engine/simulationEngine';
import type {
  ArchitectureConfig,
  CacheConfig,
  DatabaseConfig,
  IncidentLog,
  LoadBalancerConfig,
  MessageQueueConfig,
  ServerInstance,
  SimulationMetrics,
} from './types/simulation';

const EMPTY_INITIAL_CONFIG: ArchitectureConfig = {
  name: 'Clean Workspace',
  description: 'Design and simulate your distributed system architecture.',
  loadBalancer: {
    enabled: false,
    algorithm: 'round_robin',
    sslTermination: true,
    rateLimitRps: 10000,
    activeInstances: 0,
  },
  servers: [],
  database: {
    id: 'db-default',
    name: 'primary-db',
    engine: 'postgres',
    provider: 'aws',
    instanceType: 'aws-2c-4g',
    vCpu: 2,
    ramGb: 4,
    storageGb: 40,
    storageType: 'ssd',
    maxConnections: 100,
    hasConnectionPooler: false,
    poolerCapacity: 500,
    hasReadReplica: false,
    replicaCount: 0,
    status: 'healthy',
    activeConnections: 0,
    connectionPoolUtilization: 0,
    cpuUtilization: 5,
    ramUsedMb: 300,
    storageUsedGb: 5,
    bufferCacheHitRatio: 99,
    queriesPerSecond: 0,
    slowQueriesCount: 0,
    iopsSaturation: 2,
  },
  cache: {
    enabled: false,
    engine: 'redis',
    memoryGb: 1,
    hitRatio: 0,
    status: 'down',
    ramUsedMb: 0,
  },
  queue: {
    enabled: false,
    type: 'redis_bullmq',
    queueDepth: 0,
    processingRate: 0,
    deadLetterCount: 0,
    status: 'healthy',
  },
  traffic: {
    baseRps: 100,
    networkLatencyMs: 20,
    pattern: 'constant',
    spikeMultiplier: 3.0,
    spikeDurationSeconds: 15,
    distribution: {
      normalApiPercent: 80,
      heavyQueryPercent: 15,
      videoRenderPercent: 2,
      fileUploadPercent: 2,
      pdfReportPercent: 1,
    },
  },
};

export const App: React.FC = () => {
  const [config, setConfig] = useState<ArchitectureConfig>(EMPTY_INITIAL_CONFIG);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [tickCount, setTickCount] = useState<number>(0);
  const [isSpikeActive, setIsSpikeActive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'playground' | 'architecture'>('playground');

  // Metrics and logs
  const [latestMetrics, setLatestMetrics] = useState<SimulationMetrics | null>(null);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const totalStatsRef = useRef({ totalRequests: 0, totalErrors: 0 });

  // Add Component Modal
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState<boolean>(false);

  // Node Configuration Modal
  const [activeModal, setActiveModal] = useState<{
    open: boolean;
    type: 'server' | 'database' | 'cache' | 'queue' | 'loadBalancer';
    nodeId?: string;
  }>({ open: false, type: 'server' });

  // Single step execution function
  const runSimulationStep = useCallback(() => {
    setTickCount((prevTick) => {
      const nextTick = prevTick + 1;
      const { updatedConfig, metrics, newIncidents } = computeStep(
        config,
        nextTick,
        isSpikeActive,
        totalStatsRef.current
      );

      setConfig(updatedConfig);
      setLatestMetrics(metrics);

      if (newIncidents.length > 0) {
        setIncidents((prev) => [...newIncidents, ...prev.slice(0, 30)]);
      }

      return nextTick;
    });
  }, [config, isSpikeActive]);

  // Simulation Interval Loop
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      runSimulationStep();
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, runSimulationStep]);

  // Reset Simulation to Clean Canvas
  const handleReset = () => {
    setConfig(EMPTY_INITIAL_CONFIG);
    setTickCount(0);
    setLatestMetrics(null);
    setIncidents([]);
    setIsSpikeActive(false);
    totalStatsRef.current = { totalRequests: 0, totalErrors: 0 };
  };

  // Add Server Instance Clone
  const handleAddServer = (role: 'api_server' | 'worker') => {
    const existingRoleCount = config.servers.filter((s) => s.role === role).length;
    const baseServer = config.servers.find((s) => s.role === role) || config.servers[0];
    const newId = `server-${Date.now().toString().slice(-4)}`;

    const newServer: ServerInstance = {
      id: newId,
      name: role === 'worker' ? `worker-0${existingRoleCount + 1}` : `web-0${existingRoleCount + 1}`,
      role,
      provider: baseServer?.provider || 'aws',
      customProviderName: baseServer?.customProviderName,
      instanceType: baseServer?.instanceType || (role === 'worker' ? 'c6i.xlarge' : 'c6i.large'),
      vCpu: baseServer?.vCpu || (role === 'worker' ? 4 : 2),
      ramGb: baseServer?.ramGb || (role === 'worker' ? 8 : 4),
      storageGb: baseServer?.storageGb || 40,
      storageType: 'nvme',
      techStack: baseServer?.techStack || (role === 'worker' ? 'rust' : 'nodejs'),
      customTechName: baseServer?.customTechName,
      verifiedInfo: baseServer?.verifiedInfo,
      workersCount: baseServer?.workersCount || 2,
      status: 'healthy',
      cpuUtilization: 15,
      ramUsedMb: baseServer?.verifiedInfo?.baseRamMb || 250,
      ramUtilization: 10,
      storageUsedGb: 5,
      storageUtilization: 12,
      diskIopsUsed: 80,
      diskIopsLimit: 10000,
      activeConnections: 10,
      eventLoopLagMs: 0,
      threadsBusy: 2,
      threadsTotal: 8,
      uptimeSeconds: 0,
      restartCountdown: 0,
      totalCrashes: 0,
      crashReason: null,
    };

    setConfig({
      ...config,
      loadBalancer: {
        ...config.loadBalancer,
        enabled: role !== 'worker' && config.servers.filter((s) => s.role !== 'worker').length >= 1 ? true : config.loadBalancer.enabled,
      },
      servers: [...config.servers, newServer],
    });
  };

  // Delete Server Instance
  const handleDeleteServer = (serverId: string) => {
    const remainingServers = config.servers.filter((s) => s.id !== serverId);
    const remainingWeb = remainingServers.filter((s) => s.role !== 'worker').length;

    setConfig({
      ...config,
      loadBalancer: {
        ...config.loadBalancer,
        enabled: remainingWeb > 1 ? config.loadBalancer.enabled : false,
      },
      servers: remainingServers,
    });
  };

  // Add Server from AddComponentModal
  const handleAddServerFromModal = (server: ServerInstance) => {
    const isWorker = server.role === 'worker';
    const webServerCount = config.servers.filter((s) => s.role !== 'worker').length;
    const shouldEnableLb = !isWorker && webServerCount >= 1;

    setConfig({
      ...config,
      loadBalancer: shouldEnableLb
        ? { ...config.loadBalancer, enabled: true, activeInstances: webServerCount + 1 }
        : config.loadBalancer,
      servers: [...config.servers, server],
    });
  };

  // Configure Database from Modal
  const handleConfigureDatabaseFromModal = (db: DatabaseConfig) => {
    setConfig({
      ...config,
      database: db,
    });
  };

  // Configure Cache from Modal
  const handleConfigureCacheFromModal = (cache: CacheConfig) => {
    setConfig({
      ...config,
      cache,
    });
  };

  // Configure Queue & Worker from Modal
  const handleConfigureQueueFromModal = (queue: MessageQueueConfig, worker?: ServerInstance) => {
    const updatedServers = worker ? [...config.servers, worker] : config.servers;
    setConfig({
      ...config,
      queue,
      servers: updatedServers,
    });
  };

  // Configure Load Balancer from Modal
  const handleConfigureLoadBalancerFromModal = (lb: LoadBalancerConfig) => {
    setConfig({
      ...config,
      loadBalancer: lb,
    });
  };

  // Select Starter Blueprint from Zero-State
  const handleSelectStarterTemplate = (templateId: string) => {
    let newConfig: ArchitectureConfig;

    switch (templateId) {
      case 'starter-node-pg':
        newConfig = {
          name: 'Node.js + PostgreSQL on AWS',
          description: 'Single node web API with ACID relational database and PgBouncer.',
          loadBalancer: {
            enabled: false,
            algorithm: 'round_robin',
            sslTermination: true,
            rateLimitRps: 0,
            activeInstances: 1,
          },
          servers: [
            {
              id: 'node-server-01',
              name: 'web-api-01',
              role: 'api_server',
              provider: 'aws',
              instanceType: 'aws-2c-4g',
              vCpu: 2,
              ramGb: 4,
              storageGb: 40,
              storageType: 'ssd',
              techStack: 'nodejs',
              workersCount: 2,
              status: 'healthy',
              cpuUtilization: 15,
              ramUsedMb: 280,
              ramUtilization: 7,
              storageUsedGb: 5,
              storageUtilization: 12,
              diskIopsUsed: 50,
              diskIopsLimit: 3000,
              activeConnections: 12,
              eventLoopLagMs: 2.1,
              threadsBusy: 2,
              threadsTotal: 4,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
          ],
          database: {
            id: 'db-pg-primary',
            name: 'postgres-primary',
            engine: 'postgres',
            provider: 'aws',
            instanceType: 'aws-2c-4g',
            vCpu: 2,
            ramGb: 4,
            storageGb: 50,
            storageType: 'ssd',
            maxConnections: 100,
            hasConnectionPooler: true,
            poolerCapacity: 800,
            hasReadReplica: false,
            replicaCount: 0,
            status: 'healthy',
            activeConnections: 12,
            connectionPoolUtilization: 2,
            cpuUtilization: 8,
            ramUsedMb: 420,
            storageUsedGb: 8,
            bufferCacheHitRatio: 99,
            queriesPerSecond: 25,
            slowQueriesCount: 0,
            iopsSaturation: 4,
          },
          cache: {
            enabled: false,
            engine: 'redis',
            memoryGb: 1,
            hitRatio: 0,
            status: 'down',
            ramUsedMb: 0,
          },
          queue: {
            enabled: false,
            type: 'redis_bullmq',
            queueDepth: 0,
            processingRate: 0,
            deadLetterCount: 0,
            status: 'healthy',
          },
          traffic: {
            baseRps: 120,
            networkLatencyMs: 20,
            pattern: 'constant',
            spikeMultiplier: 3.5,
            spikeDurationSeconds: 15,
            distribution: {
              normalApiPercent: 75,
              heavyQueryPercent: 15,
              videoRenderPercent: 5,
              fileUploadPercent: 3,
              pdfReportPercent: 2,
            },
          },
        };
        break;

      case 'starter-bun-fly':
        newConfig = {
          name: 'Bun + Fly.io Edge Architecture',
          description: 'High-throughput JavaScriptCore/Zig runtime deployed across Fly.io MicroVMs with Postgres.',
          loadBalancer: {
            enabled: true,
            algorithm: 'least_conn',
            sslTermination: true,
            rateLimitRps: 15000,
            activeInstances: 2,
          },
          servers: [
            {
              id: 'bun-server-01',
              name: 'bun-edge-01',
              role: 'api_server',
              provider: 'custom',
              customProviderName: 'Fly.io',
              instanceType: 'fly-shared-cpu-2x',
              vCpu: 2,
              ramGb: 4,
              storageGb: 40,
              storageType: 'nvme',
              techStack: 'custom',
              customTechName: 'Bun (Elysia)',
              verifiedInfo: {
                query: 'bun',
                verified: true,
                name: 'Bun / Elysia',
                stars: 76000,
                runtimeType: 'event_loop',
                concurrencyModel: 'Event Loop + Zig Microthreads',
                baseRamMb: 45,
                maxRpsPerCore: 14000,
                sourceUrl: 'https://github.com/oven-sh/bun',
                summary: 'Ultra-fast JavaScript runtime & package manager powered by JavaScriptCore and Zig',
                vulnerabilities: ['CPU-bound synchronous task blocking'],
              },
              workersCount: 2,
              status: 'healthy',
              cpuUtilization: 10,
              ramUsedMb: 60,
              ramUtilization: 2,
              storageUsedGb: 4,
              storageUtilization: 10,
              diskIopsUsed: 90,
              diskIopsLimit: 10000,
              activeConnections: 25,
              eventLoopLagMs: 0.8,
              threadsBusy: 2,
              threadsTotal: 8,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
            {
              id: 'bun-server-02',
              name: 'bun-edge-02',
              role: 'api_server',
              provider: 'custom',
              customProviderName: 'Fly.io',
              instanceType: 'fly-shared-cpu-2x',
              vCpu: 2,
              ramGb: 4,
              storageGb: 40,
              storageType: 'nvme',
              techStack: 'custom',
              customTechName: 'Bun (Elysia)',
              verifiedInfo: {
                query: 'bun',
                verified: true,
                name: 'Bun / Elysia',
                stars: 76000,
                runtimeType: 'event_loop',
                concurrencyModel: 'Event Loop + Zig Microthreads',
                baseRamMb: 45,
                maxRpsPerCore: 14000,
                sourceUrl: 'https://github.com/oven-sh/bun',
                summary: 'Ultra-fast JavaScript runtime & package manager powered by JavaScriptCore and Zig',
                vulnerabilities: ['CPU-bound synchronous task blocking'],
              },
              workersCount: 2,
              status: 'healthy',
              cpuUtilization: 9,
              ramUsedMb: 58,
              ramUtilization: 2,
              storageUsedGb: 4,
              storageUtilization: 10,
              diskIopsUsed: 85,
              diskIopsLimit: 10000,
              activeConnections: 24,
              eventLoopLagMs: 0.7,
              threadsBusy: 2,
              threadsTotal: 8,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
          ],
          database: {
            id: 'db-pg-fly',
            name: 'postgres-fly-cluster',
            engine: 'postgres',
            provider: 'custom',
            instanceType: 'fly-dedicated-2c-4g',
            vCpu: 2,
            ramGb: 4,
            storageGb: 60,
            storageType: 'nvme',
            maxConnections: 200,
            hasConnectionPooler: true,
            poolerCapacity: 1200,
            hasReadReplica: false,
            replicaCount: 0,
            status: 'healthy',
            activeConnections: 20,
            connectionPoolUtilization: 2,
            cpuUtilization: 12,
            ramUsedMb: 520,
            storageUsedGb: 12,
            bufferCacheHitRatio: 98,
            queriesPerSecond: 80,
            slowQueriesCount: 0,
            iopsSaturation: 6,
          },
          cache: {
            enabled: true,
            engine: 'redis',
            memoryGb: 1,
            hitRatio: 90,
            status: 'healthy',
            ramUsedMb: 240,
          },
          queue: {
            enabled: false,
            type: 'redis_bullmq',
            queueDepth: 0,
            processingRate: 0,
            deadLetterCount: 0,
            status: 'healthy',
          },
          traffic: {
            baseRps: 500,
            networkLatencyMs: 8,
            pattern: 'constant',
            spikeMultiplier: 3.0,
            spikeDurationSeconds: 15,
            distribution: {
              normalApiPercent: 85,
              heavyQueryPercent: 10,
              videoRenderPercent: 2,
              fileUploadPercent: 2,
              pdfReportPercent: 1,
            },
          },
        };
        break;

      case 'starter-go-hetzner':
        newConfig = {
          name: 'Golang High-Concurrency Cluster on Hetzner',
          description: '2 Go servers with least_conn Load Balancer, Redis caching, and Hetzner efficiency.',
          loadBalancer: {
            enabled: true,
            algorithm: 'least_conn',
            sslTermination: true,
            rateLimitRps: 8000,
            activeInstances: 2,
          },
          servers: [
            {
              id: 'go-server-01',
              name: 'go-api-01',
              role: 'api_server',
              provider: 'hetzner',
              instanceType: 'hetzner-4c-8g',
              vCpu: 4,
              ramGb: 8,
              storageGb: 80,
              storageType: 'nvme',
              techStack: 'go',
              workersCount: 4,
              status: 'healthy',
              cpuUtilization: 12,
              ramUsedMb: 85,
              ramUtilization: 2,
              storageUsedGb: 6,
              storageUtilization: 8,
              diskIopsUsed: 120,
              diskIopsLimit: 12000,
              activeConnections: 20,
              eventLoopLagMs: 0,
              threadsBusy: 2,
              threadsTotal: 16,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
            {
              id: 'go-server-02',
              name: 'go-api-02',
              role: 'api_server',
              provider: 'hetzner',
              instanceType: 'hetzner-4c-8g',
              vCpu: 4,
              ramGb: 8,
              storageGb: 80,
              storageType: 'nvme',
              techStack: 'go',
              workersCount: 4,
              status: 'healthy',
              cpuUtilization: 11,
              ramUsedMb: 82,
              ramUtilization: 2,
              storageUsedGb: 6,
              storageUtilization: 8,
              diskIopsUsed: 115,
              diskIopsLimit: 12000,
              activeConnections: 18,
              eventLoopLagMs: 0,
              threadsBusy: 2,
              threadsTotal: 16,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
          ],
          database: {
            id: 'db-pg-hetzner',
            name: 'postgres-hetzner-primary',
            engine: 'postgres',
            provider: 'hetzner',
            instanceType: 'hetzner-4c-8g',
            vCpu: 4,
            ramGb: 8,
            storageGb: 100,
            storageType: 'nvme',
            maxConnections: 200,
            hasConnectionPooler: true,
            poolerCapacity: 1500,
            hasReadReplica: false,
            replicaCount: 0,
            status: 'healthy',
            activeConnections: 15,
            connectionPoolUtilization: 2,
            cpuUtilization: 8,
            ramUsedMb: 650,
            storageUsedGb: 15,
            bufferCacheHitRatio: 99,
            queriesPerSecond: 45,
            slowQueriesCount: 0,
            iopsSaturation: 5,
          },
          cache: {
            enabled: true,
            engine: 'redis',
            memoryGb: 2,
            hitRatio: 88,
            status: 'healthy',
            ramUsedMb: 400,
          },
          queue: {
            enabled: false,
            type: 'redis_bullmq',
            queueDepth: 0,
            processingRate: 0,
            deadLetterCount: 0,
            status: 'healthy',
          },
          traffic: {
            baseRps: 450,
            networkLatencyMs: 25,
            pattern: 'constant',
            spikeMultiplier: 3.0,
            spikeDurationSeconds: 15,
            distribution: {
              normalApiPercent: 85,
              heavyQueryPercent: 10,
              videoRenderPercent: 2,
              fileUploadPercent: 2,
              pdfReportPercent: 1,
            },
          },
        };
        break;

      case 'starter-rust-axum':
      default:
        newConfig = {
          name: 'Rust Tokio Async & BullMQ on AWS',
          description: '2 Rust Axum instances with asynchronous queue and dedicated Rust background worker.',
          loadBalancer: {
            enabled: true,
            algorithm: 'least_conn',
            sslTermination: true,
            rateLimitRps: 10000,
            activeInstances: 2,
          },
          servers: [
            {
              id: 'rust-server-01',
              name: 'rust-api-01',
              role: 'api_server',
              provider: 'aws',
              instanceType: 'aws-2c-4g',
              vCpu: 2,
              ramGb: 4,
              storageGb: 40,
              storageType: 'nvme',
              techStack: 'rust',
              workersCount: 2,
              status: 'healthy',
              cpuUtilization: 8,
              ramUsedMb: 35,
              ramUtilization: 1,
              storageUsedGb: 5,
              storageUtilization: 12,
              diskIopsUsed: 80,
              diskIopsLimit: 10000,
              activeConnections: 25,
              eventLoopLagMs: 0,
              threadsBusy: 2,
              threadsTotal: 8,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
            {
              id: 'rust-server-02',
              name: 'rust-api-02',
              role: 'api_server',
              provider: 'aws',
              instanceType: 'aws-2c-4g',
              vCpu: 2,
              ramGb: 4,
              storageGb: 40,
              storageType: 'nvme',
              techStack: 'rust',
              workersCount: 2,
              status: 'healthy',
              cpuUtilization: 7,
              ramUsedMb: 32,
              ramUtilization: 1,
              storageUsedGb: 5,
              storageUtilization: 12,
              diskIopsUsed: 75,
              diskIopsLimit: 10000,
              activeConnections: 22,
              eventLoopLagMs: 0,
              threadsBusy: 2,
              threadsTotal: 8,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
            {
              id: 'rust-worker-01',
              name: 'rust-worker-01',
              role: 'worker',
              provider: 'aws',
              instanceType: 'aws-4c-8g',
              vCpu: 4,
              ramGb: 8,
              storageGb: 80,
              storageType: 'nvme',
              techStack: 'rust',
              workersCount: 4,
              status: 'healthy',
              cpuUtilization: 15,
              ramUsedMb: 120,
              ramUtilization: 2,
              storageUsedGb: 8,
              storageUtilization: 10,
              diskIopsUsed: 150,
              diskIopsLimit: 10000,
              activeConnections: 4,
              eventLoopLagMs: 0,
              threadsBusy: 4,
              threadsTotal: 16,
              uptimeSeconds: 0,
              restartCountdown: 0,
              totalCrashes: 0,
              crashReason: null,
            },
          ],
          database: {
            id: 'db-pg-rust',
            name: 'postgres-rust-cluster',
            engine: 'postgres',
            provider: 'aws',
            instanceType: 'aws-2c-4g',
            vCpu: 2,
            ramGb: 4,
            storageGb: 50,
            storageType: 'ssd',
            maxConnections: 150,
            hasConnectionPooler: true,
            poolerCapacity: 1000,
            hasReadReplica: false,
            replicaCount: 0,
            status: 'healthy',
            activeConnections: 20,
            connectionPoolUtilization: 2,
            cpuUtilization: 10,
            ramUsedMb: 450,
            storageUsedGb: 10,
            bufferCacheHitRatio: 99,
            queriesPerSecond: 60,
            slowQueriesCount: 0,
            iopsSaturation: 6,
          },
          cache: {
            enabled: false,
            engine: 'redis',
            memoryGb: 1,
            hitRatio: 0,
            status: 'down',
            ramUsedMb: 0,
          },
          queue: {
            enabled: true,
            type: 'redis_bullmq',
            queueDepth: 0,
            processingRate: 35,
            deadLetterCount: 0,
            status: 'healthy',
          },
          traffic: {
            baseRps: 600,
            networkLatencyMs: 20,
            pattern: 'constant',
            spikeMultiplier: 3.0,
            spikeDurationSeconds: 15,
            distribution: {
              normalApiPercent: 65,
              heavyQueryPercent: 10,
              videoRenderPercent: 20,
              fileUploadPercent: 3,
              pdfReportPercent: 2,
            },
          },
        };
        break;
    }

    setConfig(newConfig);
    setTickCount(0);
    setLatestMetrics(null);
    setIncidents([]);
    totalStatsRef.current = { totalRequests: 0, totalErrors: 0 };
  };

  const currentRps = calculateTrafficRps(config.traffic, tickCount, isSpikeActive);

  return (
    <div
      className={`bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white ${
        viewMode === 'playground' ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Ultra-Clean Single-Row Header */}
      <Header
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onReset={handleReset}
        currentRps={currentRps}
        baseRps={config.traffic.baseRps}
        onChangeBaseRps={(newBase) =>
          setConfig((prev) => ({
            ...prev,
            traffic: { ...prev.traffic, baseRps: newBase },
          }))
        }
        networkLatencyMs={config.traffic.networkLatencyMs ?? 20}
        onChangeNetworkLatency={(latency) =>
          setConfig((prev) => ({
            ...prev,
            traffic: { ...prev.traffic, networkLatencyMs: latency },
          }))
        }
        isSpikeActive={isSpikeActive}
        onToggleSpike={() => setIsSpikeActive(!isSpikeActive)}
        metrics={latestMetrics}
        serverCount={config.servers.length}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* Main Architecture Workspace: Visual Playground (Full Screen) or Grid Overview */}
      <main
        className={
          viewMode === 'playground'
            ? 'flex-1 w-full min-h-0 flex flex-col overflow-hidden relative p-2 sm:p-3'
            : 'flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col gap-4'
        }
      >
        {viewMode === 'playground' ? (
          <SystemDesignPlayground
            config={config}
            onChangeConfig={setConfig}
            currentRps={currentRps}
            metrics={latestMetrics}
            onSelectNode={(nodeType, nodeId) =>
              setActiveModal({ open: true, type: nodeType, nodeId })
            }
            onOpenAddComponentModal={() => setIsAddComponentModalOpen(true)}
            onDeleteServer={handleDeleteServer}
            onAddServer={handleAddServer}
            onSelectStarterTemplate={handleSelectStarterTemplate}
          />
        ) : (
          <ArchitectureCanvas
            config={config}
            metrics={latestMetrics}
            onSelectNode={(nodeType, nodeId) =>
              setActiveModal({ open: true, type: nodeType, nodeId })
            }
            onAddServer={handleAddServer}
            onDeleteServer={handleDeleteServer}
            currentRps={currentRps}
            onOpenAddComponentModal={() => setIsAddComponentModalOpen(true)}
            onSelectStarterTemplate={handleSelectStarterTemplate}
          />
        )}

        {/* Dynamic Incident Notification Pill */}
        {incidents.length > 0 && (
          <div
            className={
              viewMode === 'playground'
                ? 'absolute bottom-4 right-4 z-30 max-w-md flex items-center justify-between gap-3 text-xs bg-rose-950/90 border border-rose-800/80 rounded-xl px-3.5 py-2.5 shadow-2xl backdrop-blur-md'
                : 'flex items-center justify-between gap-3 text-xs bg-rose-950/40 border border-rose-800/60 rounded-xl px-3.5 py-2.5 shadow-lg shadow-rose-950/20 backdrop-blur-sm'
            }
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <strong className="text-rose-400 shrink-0">Incident Detected:</strong>
              <span className="text-slate-100 font-semibold truncate">
                {incidents[incidents.length - 1].title}
              </span>
              <span className="text-slate-400 text-[11px] truncate hidden md:inline">
                — {incidents[incidents.length - 1].description}
              </span>
            </div>
            <button
              onClick={() => setIncidents([])}
              className="text-slate-400 hover:text-white font-medium whitespace-nowrap text-[11px] cursor-pointer bg-slate-800/60 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </main>

      {/* Add Component Modal with Live Web Verification */}
      <AddComponentModal
        isOpen={isAddComponentModalOpen}
        onClose={() => setIsAddComponentModalOpen(false)}
        config={config}
        onAddServer={handleAddServerFromModal}
        onConfigureDatabase={handleConfigureDatabaseFromModal}
        onConfigureCache={handleConfigureCacheFromModal}
        onConfigureQueue={handleConfigureQueueFromModal}
        onConfigureLoadBalancer={handleConfigureLoadBalancerFromModal}
      />

      {/* Node Config Modal */}
      {activeModal.open && (
        <NodeConfigModal
          nodeType={activeModal.type}
          nodeId={activeModal.nodeId}
          config={config}
          onClose={() => setActiveModal({ ...activeModal, open: false })}
          onSaveConfig={setConfig}
        />
      )}

      {/* Minimal Status Footer (Shown in Overview Mode) */}
      {viewMode !== 'playground' && (
        <footer className="border-t border-slate-800/80 py-3 px-6 text-center text-xs text-slate-500 bg-slate-950">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>VSystemSim • Real-World Distributed System Simulator</span>
            <span className="text-slate-400 font-mono">
              Elapsed Ticks: {tickCount} • Processed: {(latestMetrics?.totalRequestsCount ?? 0).toLocaleString()} reqs
            </span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
