import type {
  ArchitectureConfig,
  IncidentLog,
  ServerInstance,
  SimulationMetrics,
} from '../types/simulation';

export function calculateTrafficRps(
  traffic: ArchitectureConfig['traffic'],
  tick: number,
  isSpikeActive: boolean
): number {
  const { baseRps, pattern, spikeMultiplier } = traffic;
  let rps = baseRps;

  switch (pattern) {
    case 'sinusoidal': {
      // 24-second virtual day cycle
      const cycle = Math.sin((tick % 60) * ((2 * Math.PI) / 60));
      rps = baseRps * (1 + 0.35 * cycle);
      break;
    }
    case 'spike': {
      // Periodic automatic spike every 30 ticks or manual spike
      const inAutoSpike = (tick % 40 >= 25 && tick % 40 <= 35) || isSpikeActive;
      if (inAutoSpike) {
        rps = baseRps * spikeMultiplier;
      }
      break;
    }
    case 'ramp': {
      const step = Math.min(tick * 15, baseRps * 3);
      rps = baseRps + step;
      break;
    }
    case 'burst': {
      const isBurst = tick % 15 === 0 || tick % 15 === 1;
      rps = isBurst ? baseRps * (spikeMultiplier * 0.8) : baseRps;
      break;
    }
    case 'constant':
    default:
      rps = baseRps;
      break;
  }

  // Slight natural jitter +/- 4%
  const jitter = 1 + (Math.sin(tick * 1.7) * 0.04);
  return Math.max(1, Math.round(rps * jitter));
}

export function computeStep(
  config: ArchitectureConfig,
  tick: number,
  isSpikeActive: boolean,
  accumulatedMetrics: { totalRequests: number; totalErrors: number }
): {
  updatedConfig: ArchitectureConfig;
  metrics: SimulationMetrics;
  newIncidents: IncidentLog[];
} {
  const newIncidents: IncidentLog[] = [];
  const currentRps = calculateTrafficRps(config.traffic, tick, isSpikeActive);
  const nowStr = new Date().toLocaleTimeString();

  // 1. Calculate Load Balancing & Inbound distribution
  const healthyWebServers = config.servers.filter(
    (s) => s.role !== 'worker' && s.status === 'healthy'
  );
  const hasWorkers = config.servers.some((s) => s.role === 'worker' && s.status === 'healthy');

  // Workload distributions
  const dist = config.traffic.distribution;
  const normalRps = currentRps * (dist.normalApiPercent / 100);
  const heavyQueryRps = currentRps * (dist.heavyQueryPercent / 100);
  const videoRps = currentRps * (dist.videoRenderPercent / 100);
  const uploadRps = currentRps * (dist.fileUploadPercent / 100);

  // Message Queue Handling for Heavy Jobs
  let queueDepth = config.queue.queueDepth;
  let queuedVideoJobs = 0;
  if (config.queue.enabled && hasWorkers) {
    // Heavy video jobs are pushed to the message queue!
    queuedVideoJobs = videoRps;
    queueDepth = Math.max(0, queueDepth + queuedVideoJobs - (config.queue.processingRate || 20));
  } else {
    // No queue or no workers -> synchronous execution on web servers!
    queueDepth = 0;
  }

  // Rate Limiting on Load Balancer
  let effectiveInboundRps = currentRps;
  let droppedRps = 0;
  if (config.loadBalancer.enabled && config.loadBalancer.rateLimitRps > 0) {
    if (currentRps > config.loadBalancer.rateLimitRps) {
      droppedRps = currentRps - config.loadBalancer.rateLimitRps;
      effectiveInboundRps = config.loadBalancer.rateLimitRps;
      if (tick % 5 === 0) {
        newIncidents.push({
          id: `incident-rl-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          timeOffset: tick,
          severity: 'warning',
          component: 'Load Balancer',
          title: 'Rate Limit Throttling Triggered',
          description: `Load Balancer dropped ${Math.round(droppedRps)} RPS exceeding the ${config.loadBalancer.rateLimitRps} RPS rate limit threshold.`,
        });
      }
    }
  }

  // If ALL web servers are down -> Complete outage
  if (healthyWebServers.length === 0 && config.servers.length > 0) {
    const outageIncident: IncidentLog = {
      id: `incident-outage-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStr,
      timeOffset: tick,
      severity: 'fatal',
      component: 'Cluster',
      title: 'Complete System Blackout',
      description: 'All web application instances are down or crashed! 100% of incoming requests are failing (HTTP 502/503).',
    };
    if (tick % 4 === 0) {
      newIncidents.push(outageIncident);
    }
  }

  const rpsPerHealthyServer = healthyWebServers.length > 0 ? effectiveInboundRps / healthyWebServers.length : 0;

  // 2. Update each server instance
  let totalCpu = 0;
  let totalRamMb = 0;
  let totalRamMaxMb = 0;
  let serverErrorsRps = 0;

  const updatedServers: ServerInstance[] = config.servers.map((server) => {
    const s = { ...server };

    // Handle Rebooting / Restart countdown
    if (s.status === 'restarting') {
      s.restartCountdown -= 1;
      if (s.restartCountdown <= 0) {
        s.status = 'healthy';
        s.ramUsedMb = s.vCpu * 120 + 200; // base startup RAM
        s.cpuUtilization = 10;
        s.eventLoopLagMs = 1.2;
        s.crashReason = null;
        s.uptimeSeconds = 0;
        newIncidents.push({
          id: `incident-recover-${s.id}-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          timeOffset: tick,
          severity: 'info',
          component: s.name,
          title: `Instance Rebooted & Recovered`,
          description: `${s.name} (${s.provider.toUpperCase()} ${s.instanceType}) has recovered and rejoined the active pool.`,
        });
      }
      return s;
    }

    if (s.status === 'crashing') {
      s.status = 'restarting';
      s.restartCountdown = 6; // 6 ticks reboot penalty
      return s;
    }

    s.uptimeSeconds += 1;

    // Tech Stack baseline memory footprint & runtime efficiency
    let baseRamMb = 60;
    let cpuEfficiencyMultiplier = 1.0;
    let eventLoopSusceptible = false;

    if (s.verifiedInfo) {
      baseRamMb = s.verifiedInfo.baseRamMb || 60;
      switch (s.verifiedInfo.runtimeType) {
        case 'compiled':
          cpuEfficiencyMultiplier = 1.18;
          eventLoopSusceptible = false;
          break;
        case 'actor_model':
          cpuEfficiencyMultiplier = 1.10;
          eventLoopSusceptible = false;
          break;
        case 'event_loop':
          cpuEfficiencyMultiplier = 0.78;
          eventLoopSusceptible = true;
          break;
        case 'multiprocess':
          cpuEfficiencyMultiplier = 0.58;
          baseRamMb = Math.max(baseRamMb, 60 * Math.max(1, s.workersCount));
          eventLoopSusceptible = false;
          break;
        case 'jvm':
          cpuEfficiencyMultiplier = 0.88;
          eventLoopSusceptible = false;
          break;
        default:
          cpuEfficiencyMultiplier = 0.85;
          break;
      }
    } else {
      switch (s.techStack) {
        case 'rust':
          baseRamMb = 25;
          cpuEfficiencyMultiplier = 1.15;
          break;
        case 'go':
          baseRamMb = 45;
          cpuEfficiencyMultiplier = 1.05;
          break;
        case 'java':
          baseRamMb = 450;
          cpuEfficiencyMultiplier = 0.85;
          break;
        case 'python':
          baseRamMb = 70 * Math.max(1, s.workersCount);
          cpuEfficiencyMultiplier = 0.55;
          break;
        case 'nodejs':
        default:
          baseRamMb = 110;
          cpuEfficiencyMultiplier = 0.72;
          eventLoopSusceptible = true;
          break;
      }
    }

    // Determine load based on server role
    let assignedRps = 0;
    let videoJobsHandled = 0;

    if (s.role === 'worker') {
      // Dedicated background worker processing queue
      const workerCapacity = s.vCpu * 4;
      videoJobsHandled = Math.min(queueDepth, workerCapacity);
      assignedRps = videoJobsHandled;
    } else if (s.role === 'monolith') {
      // Monolith handles both web requests AND synchronous video rendering
      assignedRps = rpsPerHealthyServer;
      if (!config.queue.enabled || !hasWorkers) {
        videoJobsHandled = videoRps / Math.max(1, healthyWebServers.length);
      }
    } else {
      // Regular API server
      assignedRps = rpsPerHealthyServer;
      if (!config.queue.enabled || !hasWorkers) {
        // If no worker queue, synchronous video is forced onto API servers!
        videoJobsHandled = videoRps / Math.max(1, healthyWebServers.length);
      }
    }

    // Dynamic Connections using Little's Law (Arrival Rate x Response Time)
    const baseNetworkLatency = config.traffic.networkLatencyMs ?? 20;
    const estimatedRttSeconds = Math.max(0.04, (baseNetworkLatency + 12) / 1000);
    s.activeConnections = Math.round(assignedRps * estimatedRttSeconds * 2.4);

    // Dynamic Server Latency
    s.latencyMs = Math.round(
      (baseNetworkLatency * 0.6) +
      (s.cpuUtilization > 75 ? (s.cpuUtilization - 75) * 1.2 : 0) +
      (s.eventLoopLagMs * 0.4) +
      3
    );

    // Compute CPU demand
    // Normal request: 2ms CPU. Heavy query: 25ms. Video render: 12,000ms! Upload: 10ms. PDF: 1,500ms.
    const normReqs = assignedRps * (dist.normalApiPercent / 100);
    const heavyReqs = assignedRps * (dist.heavyQueryPercent / 100);
    const uploadReqs = assignedRps * (dist.fileUploadPercent / 100);
    const pdfReqs = assignedRps * (dist.pdfReportPercent / 100);

    const cpuTimeMsRequired =
      normReqs * 2.0 +
      heavyReqs * 22.0 +
      videoJobsHandled * 12000.0 +
      uploadReqs * 8.0 +
      pdfReqs * 1400.0;

    const serverComputeBudgetMs = s.vCpu * 1000 * cpuEfficiencyMultiplier;
    const rawCpuUtil = (cpuTimeMsRequired / Math.max(1, serverComputeBudgetMs)) * 100;
    s.cpuUtilization = Math.min(100, Math.max(4, Math.round(rawCpuUtil)));

    // Compute Memory demand (MB)
    // Base footprint + active conn buffers + video render heap (1100MB each!)
    const activeVideoMemoryMb = videoJobsHandled * 1100;
    const activeUploadMemoryMb = uploadReqs * 12;
    const activeConnectionMemoryMb = s.activeConnections * 0.35;
    const totalMemoryDemandMb = baseRamMb + activeConnectionMemoryMb + activeUploadMemoryMb + activeVideoMemoryMb;

    s.ramUsedMb = Math.round(totalMemoryDemandMb);
    const maxRamMb = s.ramGb * 1024;
    s.ramUtilization = Math.min(100, Math.round((s.ramUsedMb / maxRamMb) * 100));

    // Storage growth (video cache / tmp files)
    // Synchronous video rendering or uploads write to disk
    if (videoJobsHandled > 0 || uploadReqs > 0) {
      const diskAccumulationGb = (videoJobsHandled * 0.15 + uploadReqs * 0.04) * 0.05;
      s.storageUsedGb = Math.min(s.storageGb, Math.round((s.storageUsedGb + diskAccumulationGb) * 100) / 100);
    }
    s.storageUtilization = Math.round((s.storageUsedGb / s.storageGb) * 100);

    // Event Loop lag for Node.js
    if (eventLoopSusceptible) {
      if (videoJobsHandled > 0.5) {
        // Synchronous video render or heavy CPU on Node.js destroys the event loop!
        s.eventLoopLagMs = Math.round(videoJobsHandled * 1450 + (s.cpuUtilization * 12));
      } else if (s.cpuUtilization > 85) {
        s.eventLoopLagMs = Math.round((s.cpuUtilization - 85) * 45 + 5);
      } else {
        s.eventLoopLagMs = Math.round((1.5 + Math.random() * 2) * 10) / 10;
      }
    } else {
      s.eventLoopLagMs = 0;
    }

    // CHECK FAILURE CONDITIONS

    // 1. OOM Killer (Out Of Memory Crash)
    if (s.ramUsedMb >= maxRamMb) {
      s.status = 'crashing';
      s.totalCrashes += 1;
      s.crashReason = `Linux OOM Killer: Process killed (Out Of Memory). Allocated ${s.ramUsedMb}MB exceeded max RAM ${s.ramGb}GB limit.`;
      newIncidents.push({
        id: `incident-oom-${s.id}-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowStr,
        timeOffset: tick,
        severity: 'critical',
        component: s.name,
        title: `Kernel OOM Killer: Server ${s.name} Terminated!`,
        description: `Active memory exceeded ${s.ramGb}GB limit (${s.ramUsedMb}MB used). Kernel invoked OOM killer (SIGKILL / Exit code 137). HTTP 502 returned.`,
      });
      serverErrorsRps += assignedRps;
      return s;
    }

    // 2. Storage Full (Disk 100% Saturated)
    if (s.storageUsedGb >= s.storageGb) {
      s.status = 'crashing';
      s.totalCrashes += 1;
      s.crashReason = `Disk Full: ENOSPC (No space left on device). File system became read-only.`;
      newIncidents.push({
        id: `incident-disk-${s.id}-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowStr,
        timeOffset: tick,
        severity: 'fatal',
        component: s.name,
        title: `Disk Full Panic on ${s.name}!`,
        description: `Storage reached 100% (${s.storageGb}GB / ${s.storageGb}GB). System cannot write temp files, logs, or swaps. Server rebooting.`,
      });
      serverErrorsRps += assignedRps;
      return s;
    }

    // 3. Event Loop Freeze (Node.js) or CPU Exhaustion
    if (s.eventLoopLagMs > 3000) {
      s.status = 'degraded';
      // Inbound requests begin timing out (504)
      const timedOutRatio = Math.min(0.85, (s.eventLoopLagMs - 3000) / 4000);
      serverErrorsRps += assignedRps * timedOutRatio;
      if (tick % 4 === 0) {
        newIncidents.push({
          id: `incident-evloop-${s.id}-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          timeOffset: tick,
          severity: 'warning',
          component: s.name,
          title: `Node.js Event Loop Blocked (${s.eventLoopLagMs}ms lag)`,
          description: `Single-threaded Event Loop is starved by synchronous CPU task (video render / intensive task). HTTP requests are experiencing 504 Gateway Timeouts.`,
        });
      }
    } else if (s.cpuUtilization >= 95) {
      s.status = 'degraded';
      serverErrorsRps += assignedRps * 0.3;
    } else {
      s.status = 'healthy';
    }

    totalCpu += s.cpuUtilization;
    totalRamMb += s.ramUsedMb;
    totalRamMaxMb += maxRamMb;

    return s;
  });

  // 3. Database Layer Simulation
  const db = { ...config.database };
  const cache = { ...config.cache };

  // Cache hit logic
  let cacheHitsRps = 0;
  let dbQueriesRps = (normalRps * 0.8 + heavyQueryRps * 3.0 + uploadRps * 1.0);

  if (cache.enabled && cache.status === 'healthy') {
    const effectiveHitRate = cache.hitRatio / 100;
    cacheHitsRps = normalRps * effectiveHitRate;
    dbQueriesRps = Math.max(5, dbQueriesRps - cacheHitsRps);
    cache.ramUsedMb = Math.min(cache.memoryGb * 1024, Math.round(cache.memoryGb * 1024 * 0.4 + (cacheHitsRps * 0.5)));
    cache.latencyMs = Math.round((0.4 + Math.random() * 0.3) * 10) / 10; // ~0.4 - 0.7ms in-memory cache lookup
  } else {
    cache.latencyMs = 0;
  }

  // Database Connection Pool calculation
  let requiredDbConnections = 0;
  if (db.hasConnectionPooler) {
    // PgBouncer multiplexes connections efficiently
    requiredDbConnections = Math.round(Math.min(db.maxConnections * 0.7, dbQueriesRps * 0.05 + 8));
  } else {
    // Direct connections: every concurrent web client holds a DB connection
    const totalActiveWebConnections = updatedServers.reduce((acc, s) => acc + s.activeConnections, 0);
    requiredDbConnections = Math.round(totalActiveWebConnections * 0.35);
  }

  db.activeConnections = Math.min(db.maxConnections + 40, requiredDbConnections);
  db.connectionPoolUtilization = Math.min(100, Math.round((db.activeConnections / db.maxConnections) * 100));
  db.queriesPerSecond = Math.round(dbQueriesRps);

  // DB CPU Utilization
  let dbCpuLoad = (dbQueriesRps / (db.vCpu * 350)) * 100;
  if (!db.hasConnectionPooler && db.connectionPoolUtilization > 85) {
    // Connection churn adds massive CPU overhead
    dbCpuLoad += (db.connectionPoolUtilization - 85) * 1.5;
  }
  db.cpuUtilization = Math.min(100, Math.max(8, Math.round(dbCpuLoad)));

  // Dynamic DB Query Latency (ms)
  let dbQueryLatency = 2.5;
  if (db.connectionPoolUtilization > 75) {
    dbQueryLatency += Math.pow((db.connectionPoolUtilization - 75) / 3, 1.6);
  }
  if (db.cpuUtilization > 80) {
    dbQueryLatency += (db.cpuUtilization - 80) * 1.6;
  }
  db.queryLatencyMs = Math.round(dbQueryLatency * 10) / 10;

  let dbErrorRps = 0;

  // DB Connection Pool Failure Check
  if (db.activeConnections >= db.maxConnections) {
    db.status = 'overloaded';
    const excessConnections = db.activeConnections - db.maxConnections;
    dbErrorRps = Math.round(excessConnections * 1.5);
    if (tick % 3 === 0) {
      newIncidents.push({
        id: `incident-dbpool-${tick}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowStr,
        timeOffset: tick,
        severity: 'critical',
        component: db.name,
        title: `Database Connection Pool Saturated (${db.activeConnections}/${db.maxConnections})`,
        description: `PostgreSQL rejected incoming connections with: 'FATAL: remaining connection slots are reserved for non-replication superuser connections'. HTTP 500 thrown.`,
      });
    }
  } else if (db.cpuUtilization > 90) {
    db.status = 'overloaded';
  } else {
    db.status = 'healthy';
  }

  // 4. Latency Calculation
  // Base network latency + queuing delay + DB query latency + CPU delay
  const baseNetworkLatency = config.traffic.networkLatencyMs ?? 20;
  const dbDelay = Math.max(0, (db.queryLatencyMs ?? 2.5) - 2.5);
  const maxServerLag = Math.max(0, ...updatedServers.map((s) => s.eventLoopLagMs));
  const avgCpu = updatedServers.length > 0 ? totalCpu / updatedServers.length : 0;
  const cpuDelay = avgCpu > 75 ? Math.pow((avgCpu - 75) / 3, 1.7) : 0;

  const p50LatencyMs = Math.round(baseNetworkLatency + (dbDelay * 0.4) + (cpuDelay * 0.35) + 3);
  const p95LatencyMs = Math.round(baseNetworkLatency * 1.8 + (dbDelay * 1.2) + (cpuDelay * 1.4) + (maxServerLag * 0.5) + 8);
  const p99LatencyMs = Math.round(baseNetworkLatency * 2.8 + (dbDelay * 2.4) + (cpuDelay * 2.6) + maxServerLag + 15);

  // 5. Total Error and Success Calculations
  const totalErrorsThisTick = Math.round(Math.min(currentRps, serverErrorsRps + dbErrorRps));
  const successRps = Math.max(0, Math.round(effectiveInboundRps - totalErrorsThisTick));
  const errorRps = Math.min(currentRps, totalErrorsThisTick);

  accumulatedMetrics.totalRequests += currentRps;
  accumulatedMetrics.totalErrors += (errorRps + droppedRps);

  const metrics: SimulationMetrics = {
    timestamp: tick,
    totalInboundRps: currentRps,
    successRps,
    errorRps,
    droppedRps: Math.round(droppedRps),
    p50LatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    averageCpuPercent: Math.round(avgCpu),
    averageRamPercent: totalRamMaxMb > 0 ? Math.round((totalRamMb / totalRamMaxMb) * 100) : 0,
    dbPoolSaturationPercent: db.connectionPoolUtilization,
    totalErrorsCount: accumulatedMetrics.totalErrors,
    totalRequestsCount: accumulatedMetrics.totalRequests,
  };

  const updatedConfig: ArchitectureConfig = {
    ...config,
    servers: updatedServers,
    database: db,
    cache,
    queue: {
      ...config.queue,
      queueDepth: Math.round(queueDepth),
    },
  };

  return {
    updatedConfig,
    metrics,
    newIncidents,
  };
}

export function calculateHostingCost(config: ArchitectureConfig): {
  computeCost: number;
  databaseCost: number;
  cacheCost: number;
  loadBalancerCost: number;
  bandwidthCost: number;
  totalMonthly: number;
} {
  // Approximate realistic cloud pricing (AWS/DO/Hetzner average)
  let computeCost = 0;
  for (const s of config.servers) {
    // $12 per vCPU + $4 per GB RAM + $0.10 per GB SSD monthly
    const serverBase = s.vCpu * 12 + s.ramGb * 4 + s.storageGb * 0.10;
    computeCost += serverBase;
  }

  // Database Cost: Managed DB has ~1.8x premium
  const db = config.database;
  let databaseCost = (db.vCpu * 18 + db.ramGb * 7 + db.storageGb * 0.15);
  if (db.hasReadReplica) {
    databaseCost += databaseCost * 0.8 * db.replicaCount;
  }

  // Cache Cost (e.g. AWS ElastiCache / Redis)
  const cacheCost = config.cache.enabled ? 15 + config.cache.memoryGb * 12 : 0;

  // Load Balancer Cost (ALB ~$22/mo + LCU)
  const loadBalancerCost = config.loadBalancer.enabled ? 24 : 0;

  // Bandwidth Cost (e.g. $0.08 per GB egress)
  const monthlyRequests = config.traffic.baseRps * 3600 * 24 * 30;
  const estimatedGbEgress = (monthlyRequests * 45) / (1024 * 1024); // avg 45KB payload
  const bandwidthCost = Math.round(estimatedGbEgress * 0.05);

  const totalMonthly = Math.round(computeCost + databaseCost + cacheCost + loadBalancerCost + bandwidthCost);

  return {
    computeCost: Math.round(computeCost),
    databaseCost: Math.round(databaseCost),
    cacheCost: Math.round(cacheCost),
    loadBalancerCost,
    bandwidthCost,
    totalMonthly,
  };
}
