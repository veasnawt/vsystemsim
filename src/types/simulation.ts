import type { WebVerifiedInfo } from '../engine/webVerifier';

export type TechStack = 'nodejs' | 'python' | 'go' | 'java' | 'rust' | string;

export type HostingProvider = 'aws' | 'gcp' | 'digitalocean' | 'hetzner' | 'baremetal' | string;

export type StorageType = 'nvme' | 'ssd' | 'hdd' | 'ebs_gp3';

export type TrafficPattern = 'constant' | 'sinusoidal' | 'spike' | 'ramp' | 'burst';

export type DatabaseEngine = 'postgres' | 'mysql' | 'mongodb' | 'redis';

export type TaskType = 'normal_api' | 'heavy_query' | 'video_render' | 'file_upload' | 'pdf_report';

export interface WorkloadDistribution {
  normalApiPercent: number;    // Lightweight I/O request (1-3ms CPU, 0.05MB RAM)
  heavyQueryPercent: number;   // Complex aggregation / unindexed DB scan (20-40ms CPU, 2MB RAM)
  videoRenderPercent: number;  // Intensive CPU & RAM transcode (10,000-20,000ms CPU, 1200MB RAM, 300MB disk temp)
  fileUploadPercent: number;   // High payload network & disk I/O (15ms CPU, 15MB RAM, 100MB disk)
  pdfReportPercent: number;    // CPU-bound document generation (1500ms CPU, 250MB RAM)
}

export interface ServerInstance {
  id: string;
  name: string;
  role: 'api_server' | 'worker' | 'monolith';
  provider: HostingProvider;
  instanceType: string;
  vCpu: number;          // e.g. 2, 4, 8 cores
  ramGb: number;         // e.g. 1, 2, 4, 8, 16 GB
  storageGb: number;     // e.g. 20, 50, 200 GB
  storageType: StorageType;
  techStack: TechStack;
  workersCount: number;  // for Python Gunicorn or Node cluster
  
  // Real-time dynamic state
  status: 'healthy' | 'degraded' | 'crashing' | 'restarting';
  cpuUtilization: number;    // 0 - 100%
  ramUsedMb: number;         // in MB
  ramUtilization: number;    // 0 - 100%
  storageUsedGb: number;     // in GB
  storageUtilization: number;// 0 - 100%
  diskIopsUsed: number;
  diskIopsLimit: number;
  activeConnections: number;
  eventLoopLagMs: number;    // for Node.js
  threadsBusy: number;
  threadsTotal: number;
  uptimeSeconds: number;
  restartCountdown: number;  // when crashed, seconds until reboot
  totalCrashes: number;
  crashReason: string | null;
  customTechName?: string;
  customProviderName?: string;
  verifiedInfo?: WebVerifiedInfo;
  latencyMs?: number;
}

export interface DatabaseConfig {
  id: string;
  name: string;
  engine: DatabaseEngine;
  provider: HostingProvider;
  instanceType: string;
  vCpu: number;
  ramGb: number;
  storageGb: number;
  storageType: StorageType;
  maxConnections: number;
  hasConnectionPooler: boolean; // e.g. PgBouncer
  poolerCapacity: number;
  hasReadReplica: boolean;
  replicaCount: number;
  
  // Real-time state
  status: 'healthy' | 'overloaded' | 'down';
  activeConnections: number;
  connectionPoolUtilization: number; // 0 - 100%
  cpuUtilization: number;
  ramUsedMb: number;
  storageUsedGb: number;
  bufferCacheHitRatio: number; // 0 - 100%
  queriesPerSecond: number;
  slowQueriesCount: number;
  iopsSaturation: number; // 0 - 100%
  queryLatencyMs?: number;
}

export interface CacheConfig {
  enabled: boolean;
  engine: 'redis' | 'memcached';
  memoryGb: number;
  hitRatio: number; // 0 - 100%
  status: 'healthy' | 'down';
  ramUsedMb: number;
  latencyMs?: number;
}

export interface MessageQueueConfig {
  enabled: boolean;
  type: 'redis_bullmq' | 'rabbitmq' | 'sqs' | 'kafka';
  queueDepth: number;
  processingRate: number; // jobs/sec
  deadLetterCount: number;
  status: 'healthy' | 'backlogged';
}

export interface LoadBalancerConfig {
  enabled: boolean;
  algorithm: 'round_robin' | 'least_conn';
  sslTermination: boolean;
  rateLimitRps: number; // 0 = unlimited
  activeInstances: number;
}

export interface TrafficConfig {
  baseRps: number;
  pattern: TrafficPattern;
  spikeMultiplier: number;
  spikeDurationSeconds: number;
  distribution: WorkloadDistribution;
  networkLatencyMs?: number; // Base round-trip network latency (e.g. 5ms local, 20ms cloud, 80ms cross-region, 160ms global)
}

export interface SimulationMetrics {
  timestamp: number;
  totalInboundRps: number;
  successRps: number;
  errorRps: number;
  droppedRps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  averageCpuPercent: number;
  averageRamPercent: number;
  dbPoolSaturationPercent: number;
  totalErrorsCount: number;
  totalRequestsCount: number;
}

export interface IncidentLog {
  id: string;
  timestamp: string;
  timeOffset: number; // seconds into simulation
  severity: 'info' | 'warning' | 'critical' | 'fatal';
  title: string;
  description: string;
  component: string;
}

export interface ArchitectureRecommendation {
  id: string;
  category: 'scalability' | 'reliability' | 'performance' | 'cost';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  problem: string;
  solution: string;
  tradeoffs: string;
  actionKey?: string;
  estimatedCostDeltaMonthly: number;
}

export interface CostEstimate {
  computeCost: number;
  databaseCost: number;
  cacheCost: number;
  loadBalancerCost: number;
  bandwidthCost: number;
  totalMonthly: number;
}

export interface ArchitectureConfig {
  name: string;
  description: string;
  loadBalancer: LoadBalancerConfig;
  servers: ServerInstance[];
  database: DatabaseConfig;
  cache: CacheConfig;
  queue: MessageQueueConfig;
  traffic: TrafficConfig;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number; // 1x, 2x, 5x, 10x
  tickCount: number;
  elapsedSeconds: number;
  config: ArchitectureConfig;
  history: SimulationMetrics[];
  incidents: IncidentLog[];
  recommendations: ArchitectureRecommendation[];
  costEstimate: CostEstimate;
}
