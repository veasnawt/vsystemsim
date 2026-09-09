import type {
  ArchitectureConfig,
  ArchitectureRecommendation,
  SimulationMetrics,
} from '../types/simulation';

export function analyzeSystemAndRecommend(
  config: ArchitectureConfig,
  recentMetrics: SimulationMetrics[]
): ArchitectureRecommendation[] {
  const recommendations: ArchitectureRecommendation[] = [];

  if (recentMetrics.length === 0) return recommendations;

  const latest = recentMetrics[recentMetrics.length - 1];
  const webServers = config.servers.filter((s) => s.role !== 'worker');
  const workerServers = config.servers.filter((s) => s.role === 'worker');
  const hasWorkers = workerServers.length > 0;
  const dist = config.traffic.distribution;

  // 1. VIDEO RENDERING / HEAVY TASK BOTTLENECK
  if (dist.videoRenderPercent > 0 && (!config.queue.enabled || !hasWorkers)) {
    const oomServers = config.servers.filter((s) => s.ramUtilization > 85 || s.totalCrashes > 0);
    const eventLoopLagServers = config.servers.filter((s) => s.eventLoopLagMs > 1000);

    if (oomServers.length > 0 || eventLoopLagServers.length > 0 || latest.errorRps > 0) {
      recommendations.push({
        id: 'rec-decouple-video-queue',
        category: 'reliability',
        priority: 'critical',
        title: 'Decouple Video Rendering via Async Message Queue (BullMQ / AWS SQS)',
        problem: `Heavy video transcode tasks (${dist.videoRenderPercent}% of traffic) are executed synchronously on your web/API server. This consumes up to 1.2GB RAM and 12,000ms CPU per job, causing Event Loop freeze, Linux OOM Killer terminations, and 504 Gateway Timeouts.`,
        solution: `Introduce an asynchronous message broker (Redis BullMQ, AWS SQS, or RabbitMQ) and separate worker instances (e.g. AWS c6i.xlarge or DO CPU-Optimized). The web server will immediately return HTTP 202 Accepted with a Job ID in < 5ms while background workers process video encoding safely without risking web tier availability.`,
        tradeoffs: `Adds message broker operational overhead and eventual consistency for job completion status (needs WebSocket / polling for client progress).`,
        actionKey: 'apply-decouple-queue',
        estimatedCostDeltaMonthly: 45,
      });
    }
  }

  // 2. DATABASE CONNECTION POOL SATURATION
  if (latest.dbPoolSaturationPercent >= 80 && !config.database.hasConnectionPooler) {
    recommendations.push({
      id: 'rec-add-pgbouncer',
      category: 'scalability',
      priority: 'critical',
      title: 'Deploy Connection Pooler (PgBouncer / AWS RDS Proxy)',
      problem: `Database connection pool utilization is at ${latest.dbPoolSaturationPercent}% (${config.database.activeConnections}/${config.database.maxConnections}). Direct connections from multiple web server workers risk throwing 'FATAL: too many connections', causing cascade HTTP 500 crashes.`,
      solution: `Deploy PgBouncer in transaction pooling mode or AWS RDS Proxy. This multiplexes thousands of incoming web requests across a small, reuse-optimized pool of 20-40 physical PostgreSQL connections, reducing DB CPU context switching by up to 60%.`,
      tradeoffs: `Transaction pooling mode disables certain session-level PostgreSQL features (like PREPARE statements across transactions or LISTEN/NOTIFY).`,
      actionKey: 'apply-enable-pooler',
      estimatedCostDeltaMonthly: 15,
    });
  }

  // 3. HIGH DB LOAD - MISSING CACHING LAYER
  if (!config.cache.enabled && (latest.averageCpuPercent > 60 || config.database.cpuUtilization > 65)) {
    recommendations.push({
      id: 'rec-enable-redis-cache',
      category: 'performance',
      priority: 'high',
      title: 'Implement In-Memory Redis Caching Layer',
      problem: `All read requests (${dist.normalApiPercent + dist.heavyQueryPercent}% of traffic) are querying the database directly. Database CPU is at ${config.database.cpuUtilization}%, resulting in elevated p95 latency (${latest.p95LatencyMs}ms).`,
      solution: `Add a managed Redis or Memcached in-memory caching tier with Cache-Aside pattern for frequently accessed records. At an 85% cache hit ratio, database read load drops by over 80% and API p95 latency plummets below 20ms.`,
      tradeoffs: `Requires cache invalidation logic on write/update operations and handles cache stampede scenarios with mutex locks.`,
      actionKey: 'apply-enable-cache',
      estimatedCostDeltaMonthly: 25,
    });
  }

  // 4. SINGLE POINT OF FAILURE (SPOF)
  if (webServers.length === 1 && !config.loadBalancer.enabled) {
    recommendations.push({
      id: 'rec-horizontal-scaling',
      category: 'reliability',
      priority: 'high',
      title: 'Add Load Balancer & Scale to Multiple Web Instances (HA)',
      problem: `The architecture is running on a single server instance without a load balancer. If this instance experiences an OOM crash, kernel panic, or hardware reboot, 100% of user traffic is instantly blacked out.`,
      solution: `Place an Application Load Balancer (ALB / Nginx / Cloudflare) in front and scale to at least 2 or 3 smaller instances across different availability zones. If any instance fails a health check, traffic is automatically rerouted to healthy peers.`,
      tradeoffs: `Requires stateless session management (e.g. JWT or Redis session store) and slightly higher infrastructure cost.`,
      actionKey: 'apply-scale-horizontal',
      estimatedCostDeltaMonthly: 38,
    });
  }

  // 5. STORAGE EXHAUSTION WARNING
  const lowDiskServers = config.servers.filter((s) => s.storageUtilization > 75);
  if (lowDiskServers.length > 0) {
    recommendations.push({
      id: 'rec-storage-s3-offload',
      category: 'reliability',
      priority: 'critical',
      title: 'Offload Temp Media to Object Storage (AWS S3 / Cloudflare R2)',
      problem: `Server storage is at ${lowDiskServers[0].storageUtilization}% (${lowDiskServers[0].storageUsedGb}GB / ${lowDiskServers[0].storageGb}GB). Uncleaned render temp files and upload buffers will soon trigger ENOSPC (Disk Full) panics, turning disk read-only.`,
      solution: `Stream uploads directly to object storage (AWS S3, Google Cloud Storage, or Cloudflare R2) using presigned URLs. Configure automated cron jobs or systemd tmpfiles to clean ephemeral /tmp transcode caches, and expand disk volume.`,
      tradeoffs: `Requires S3 API integration in client/server code and IAM bucket permission management.`,
      actionKey: 'apply-expand-storage',
      estimatedCostDeltaMonthly: 10,
    });
  }

  // 6. TECH STACK EFFICIENCY COMPARISON
  const hasNodeOrPython = webServers.some((s) => s.techStack === 'nodejs' || s.techStack === 'python');
  if (hasNodeOrPython && latest.totalInboundRps > 1200 && latest.averageCpuPercent > 65) {
    recommendations.push({
      id: 'rec-tech-stack-go',
      category: 'performance',
      priority: 'medium',
      title: 'Consider Go (Golang) or Rust for High-Throughput Ingress',
      problem: `Handling ${latest.totalInboundRps} RPS with interpreted or single-threaded runtimes creates high CPU load (${latest.averageCpuPercent}%) and memory overhead. Python GIL limits multi-core efficiency, while Node.js event loop is susceptible to blocking.`,
      solution: `Rewriting performance-critical ingress or microservice APIs in Go (Gin/Fiber) or Rust (Axum) enables native multi-threaded concurrency with lightweight goroutines (only ~4KB memory per connection), dropping CPU utilization by up to 60%.`,
      tradeoffs: `Engineering rewrite cost and team learning curve for compiled, statically-typed languages.`,
      actionKey: 'apply-switch-golang',
      estimatedCostDeltaMonthly: -20, // saves server sizing cost!
    });
  }

  // 7. READ REPLICAS FOR DATABASE
  if (config.database.cpuUtilization > 70 && !config.database.hasReadReplica && dist.heavyQueryPercent > 15) {
    recommendations.push({
      id: 'rec-db-read-replica',
      category: 'scalability',
      priority: 'medium',
      title: 'Add Read Replica for Analytics & Heavy Queries',
      problem: `Heavy queries and reporting (${dist.heavyQueryPercent}% of traffic) are directly contending with transactional writes on the primary database, causing database CPU to reach ${config.database.cpuUtilization}%.`,
      solution: `Provision an asynchronous Read Replica. Route reporting, search, and dashboard queries to the replica while reserving the primary instance exclusively for write transactions.`,
      tradeoffs: `Small replication lag (typically 5-50ms) between primary and read replicas.`,
      actionKey: 'apply-db-replica',
      estimatedCostDeltaMonthly: 35,
    });
  }

  return recommendations;
}
