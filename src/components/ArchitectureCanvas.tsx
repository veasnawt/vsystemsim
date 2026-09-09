import React from 'react';
import {
  Desktop,
  Database,
  Globe,
  Users,
  Factory,
  Add,
  Delete,
  Bug,
  Video,
  Star,
  Check,
  Notification,
} from '@veasnawt/vicons';
import type {
  ArchitectureConfig,
  ServerInstance,
  SimulationMetrics,
} from '../types/simulation';

interface ArchitectureCanvasProps {
  config: ArchitectureConfig;
  metrics?: SimulationMetrics | null;
  onSelectNode: (nodeType: 'server' | 'database' | 'cache' | 'queue' | 'loadBalancer', nodeId?: string) => void;
  onAddServer: (role: 'api_server' | 'worker') => void;
  onDeleteServer: (serverId: string) => void;
  currentRps: number;
  onOpenAddComponentModal: () => void;
  onSelectStarterTemplate?: (templateId: string) => void;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  config,
  metrics,
  onSelectNode,
  onAddServer,
  onDeleteServer,
  currentRps,
  onOpenAddComponentModal,
  onSelectStarterTemplate,
}) => {
  const webServers = config.servers.filter((s) => s.role !== 'worker');
  const workerServers = config.servers.filter((s) => s.role === 'worker');

  const getStatusBadge = (status: ServerInstance['status']) => {
    switch (status) {
      case 'healthy':
        return { text: 'Healthy', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'degraded':
        return { text: 'Degraded', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'crashing':
        return { text: 'CRASHED', color: 'bg-rose-600 text-white font-bold border-rose-500 animate-pulse' };
      case 'restarting':
        return { text: 'Rebooting', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
  };

  const getTechStackBadge = (server: ServerInstance) => {
    if (server.verifiedInfo) {
      const stars = server.verifiedInfo.stars ? `${(server.verifiedInfo.stars / 1000).toFixed(0)}k` : null;
      return {
        label: server.verifiedInfo.name,
        stars,
        color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold',
        verified: true,
      };
    }
    if (server.customTechName) {
      return {
        label: server.customTechName,
        stars: null,
        color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        verified: false,
      };
    }
    switch (server.techStack) {
      case 'nodejs':
        return { label: 'Node.js', stars: null, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', verified: false };
      case 'python':
        return { label: 'Python (FastAPI)', stars: null, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', verified: false };
      case 'go':
        return { label: 'Go (Goroutines)', stars: null, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', verified: false };
      case 'rust':
        return { label: 'Rust (Axum)', stars: null, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', verified: false };
      case 'java':
        return { label: 'Java (JVM)', stars: null, color: 'bg-red-500/10 text-red-400 border-red-500/20', verified: false };
      default:
        return { label: String(server.techStack), stars: null, color: 'bg-slate-700/50 text-slate-300 border-slate-600', verified: false };
    }
  };

  // FIRST-TIME VISITOR / EMPTY CANVAS EXPERIENCE (systemdesignsim.com inspired)
  if (webServers.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-1">
        {/* Top Minimal Ingress Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Inbound User Traffic</div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentRps} RPS Simulation Ready</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                  {config.traffic.pattern}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onOpenAddComponentModal}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-102"
          >
            <Add size={14} />
            <span>Add Component</span>
          </button>
        </div>

        {/* HERO ZERO-STATE: SYSTEMDESIGNSIM STYLE BUILDER */}
        <div className="flex flex-col items-center justify-center p-8 sm:p-14 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-900/40 text-center relative overflow-hidden transition-all shadow-xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Big Plus Button */}
          <button
            onClick={onOpenAddComponentModal}
            className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all cursor-pointer mb-5"
            title="Click to Add Component (Choose Tech Stack, Provider, Hardware Specs)"
          >
            <Add size={42} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            Build Your System Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
            Your canvas is currently clean. Click the <strong className="text-indigo-400 font-bold">+</strong> button above to pick your tech stack (<span className="text-slate-300">Node.js, Go, Rust, Python, Java</span>), cloud hosting provider (<span className="text-slate-300">AWS, GCP, DigitalOcean, Hetzner</span>), and hardware specs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <button
              onClick={onOpenAddComponentModal}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
            >
              <Add size={16} />
              <span>Configure & Add Component</span>
            </button>
          </div>

          {/* Quick Starter Blueprints */}
          <div className="w-full max-w-3xl pt-6 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Or Jumpstart with a Preconfigured Architecture:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
              {[
                {
                  id: 'starter-node-pg',
                  title: 'Node.js + Postgres',
                  provider: 'AWS (t4g)',
                  desc: 'Single node web API with ACID relational storage',
                  color: 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20',
                  badge: 'Node.js',
                  badgeColor: 'text-emerald-400 bg-emerald-500/10',
                },
                {
                  id: 'starter-bun-fly',
                  title: 'Bun + Fly.io',
                  provider: 'Fly.io (Edge)',
                  desc: 'High-throughput Zig event loop on Firecracker MicroVMs',
                  color: 'border-violet-500/30 hover:border-violet-400 bg-violet-950/10 hover:bg-violet-950/20',
                  badge: 'Bun',
                  stars: '76k',
                  badgeColor: 'text-violet-400 bg-violet-500/10',
                },
                {
                  id: 'starter-go-hetzner',
                  title: 'Golang Cluster',
                  provider: 'Hetzner (CPX)',
                  desc: 'High-concurrency Goroutines with Load Balancer',
                  color: 'border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/20',
                  badge: 'Go',
                  badgeColor: 'text-cyan-400 bg-cyan-500/10',
                },
                {
                  id: 'starter-rust-axum',
                  title: 'Rust Axum + Queue',
                  provider: 'AWS (c6i)',
                  desc: 'Tokio async engine with BullMQ worker pool',
                  color: 'border-orange-500/30 hover:border-orange-400 bg-orange-950/10 hover:bg-orange-950/20',
                  badge: 'Rust',
                  badgeColor: 'text-orange-400 bg-orange-500/10',
                },
              ].map((starter) => (
                <button
                  key={starter.id}
                  onClick={() => onSelectStarterTemplate && onSelectStarterTemplate(starter.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${starter.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border border-current/20 flex items-center gap-1 ${starter.badgeColor}`}>
                        <span>{starter.badge}</span>
                        {'stars' in starter && starter.stars && (
                          <span className="flex items-center gap-0.5 opacity-90">
                            <span>({starter.stars}</span>
                            <Star size={9} className="text-amber-400" />
                            <span>)</span>
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{starter.provider}</span>
                    </div>
                    <strong className="text-xs font-bold text-white block mb-0.5">{starter.title}</strong>
                    <p className="text-[10px] text-slate-400 leading-snug m-0">{starter.desc}</p>
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                    <span>Deploy</span>
                    <span>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Canvas Top Action Strip */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-bold text-white tracking-tight">Active Architecture</span>
          <span className="text-slate-600">•</span>
          <span>{webServers.length} Web Server{webServers.length === 1 ? '' : 's'}</span>
          <span className="text-slate-600">•</span>
          <span>{config.database.engine.toUpperCase()}</span>
          {config.cache.enabled && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400 font-medium">Redis</span>
            </>
          )}
          {config.queue.enabled && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-medium">BullMQ</span>
            </>
          )}
        </div>
        <button
          onClick={onOpenAddComponentModal}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
        >
          <Add size={14} />
          <span>+ Add Component</span>
        </button>
      </div>

      {/* 1. COMPACT INGRESS & LOAD BALANCER ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
        {/* Inbound Traffic */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Inbound User Traffic</div>
              <div className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{currentRps} RPS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                  {config.traffic.pattern}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div>Base: <strong className="text-slate-200">{config.traffic.baseRps} RPS</strong></div>
            <div className="text-[10px] text-amber-300 font-mono mt-0.5">
              Net Latency: <strong>{config.traffic.networkLatencyMs ?? 20}ms</strong> (p50: {metrics?.p50LatencyMs ?? config.traffic.networkLatencyMs ?? 20}ms)
            </div>
          </div>
        </div>

        {/* Load Balancer */}
        <div
          onClick={() => onSelectNode('loadBalancer')}
          className={`cursor-pointer border rounded-xl p-3 flex items-center justify-between transition-all shadow-sm hover:border-blue-400 ${
            config.loadBalancer.enabled
              ? 'bg-slate-900/80 border-blue-500/30 hover:border-blue-400'
              : 'bg-slate-900/30 border-slate-800 opacity-60'
          }`}
          title="Click to configure Load Balancer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Globe size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">
                {config.loadBalancer.enabled ? 'Load Balancer (ALB)' : 'Direct Ingress (No LB)'}
              </div>
              <div className="text-xs font-semibold text-white">
                {config.loadBalancer.enabled ? (
                  <span>
                    Algorithm: <strong className="text-blue-300 capitalize">{config.loadBalancer.algorithm.replace('_', ' ')}</strong>
                  </span>
                ) : (
                  <span className="text-amber-400 text-[11px] inline-flex items-center gap-1">
                    <Notification size={11} className="text-amber-400 shrink-0" />
                    <span>Traffic hits single instance directly</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            Routes to: <strong className="text-slate-200">{webServers.length} Servers</strong>
          </div>
        </div>
      </div>

      {/* 2. WEB & API COMPUTE TIER */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Desktop size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Web & API Servers ({webServers.length} Instances)
            </span>
            {webServers.length === 1 && (
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                Single Point of Failure
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddComponentModal}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Configure stack, cloud provider & hardware specs"
            >
              <Add size={13} />
              <span>Configure Stack</span>
            </button>
            <button
              onClick={() => onAddServer('api_server')}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            >
              <Add size={13} />
              <span>Clone Instance</span>
            </button>
          </div>
        </div>

        {/* Server Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {webServers.map((server) => {
            const tech = getTechStackBadge(server);
            const status = getStatusBadge(server.status);
            const isCrashing = server.status === 'crashing';
            const isDegraded = server.status === 'degraded';
            const providerName = server.customProviderName || server.provider;

            return (
              <div
                key={server.id}
                onClick={() => onSelectNode('server', server.id)}
                className={`border rounded-lg p-3 transition-all cursor-pointer hover:border-indigo-400 relative overflow-hidden bg-slate-900/90 ${
                  isCrashing
                    ? 'border-rose-500 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500'
                    : isDegraded
                    ? 'border-amber-500/50 bg-amber-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Line */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-xs font-bold text-white truncate">{server.name}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {providerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${status.color}`}>
                      {server.status === 'restarting' ? `Rebooting (${server.restartCountdown}s)` : status.text}
                    </span>
                    {webServers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteServer(server.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                        title="Remove Server"
                      >
                        <Delete size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Hardware Specs & Tech Stack */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>{server.vCpu} vCPU • {server.ramGb}GB RAM</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border flex items-center gap-1 ${tech.color}`}>
                    {tech.verified && <Check size={10} className="text-emerald-400 font-bold" />}
                    <span>{tech.label}</span>
                    {tech.stars && (
                      <span className="inline-flex items-center gap-0.5 text-slate-400">
                        <span>({tech.stars}</span>
                        <Star size={9} className="text-amber-400" />
                        <span>)</span>
                      </span>
                    )}
                  </span>
                </div>

                {/* Crash Warning Banner */}
                {server.crashReason && (
                  <div className="mb-2 p-1.5 rounded bg-rose-950/80 border border-rose-700/60 text-[10px] text-rose-300 flex items-start gap-1">
                    <Bug size={13} className="shrink-0 mt-0.5 text-rose-400" />
                    <span className="line-clamp-2 leading-tight">{server.crashReason}</span>
                  </div>
                )}

                {/* Hardware Meters: CPU & RAM */}
                <div className="space-y-1.5 text-xs">
                  {/* CPU Meter */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">CPU</span>
                      <span className={`font-semibold ${server.cpuUtilization > 85 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {server.cpuUtilization}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          server.cpuUtilization > 85
                            ? 'bg-rose-500'
                            : server.cpuUtilization > 65
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${server.cpuUtilization}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Meter */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">RAM</span>
                      <span className={`font-semibold ${server.ramUtilization > 85 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {server.ramUsedMb}MB / {server.ramGb * 1024}MB ({server.ramUtilization}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          server.ramUtilization > 90
                            ? 'bg-rose-500'
                            : server.ramUtilization > 75
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${server.ramUtilization}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Event Loop Alert (Node.js) or Active Conns */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-800/80">
                  <span>Conns: <strong className="text-slate-400">{server.activeConnections}</strong></span>
                  <span className="text-amber-300 font-mono">
                    RTT: {server.latencyMs ?? (config.traffic.networkLatencyMs ?? 20) + 2}ms
                  </span>
                  {server.techStack === 'nodejs' && server.eventLoopLagMs > 100 ? (
                    <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                      <span>Lag: {server.eventLoopLagMs}ms</span>
                      <Notification size={10} className="text-amber-400 shrink-0" />
                    </span>
                  ) : (
                    <span>Disk: {server.storageUsedGb.toFixed(0)}/{server.storageGb}GB</span>
                  )}
                  <span>Crashes: <strong className={server.totalCrashes > 0 ? 'text-rose-400' : 'text-slate-400'}>{server.totalCrashes}</strong></span>
                </div>
              </div>
            );
          })}

          {/* Interactive + Add Server / Stack Card */}
          <button
            type="button"
            onClick={onOpenAddComponentModal}
            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 bg-slate-950/30 hover:bg-indigo-950/15 transition-all cursor-pointer min-h-[160px] group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Add size={16} />
            </div>
            <span className="text-xs font-bold text-white">Add Server / Tech Stack</span>
            <span className="text-[10px] text-slate-500 text-center">Node, Go, Rust, Python, Java + Cloud Specs</span>
          </button>
        </div>
      </div>

      {/* 3. ASYNC QUEUE & BACKGROUND WORKERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Message Queue */}
        <div
          onClick={() => onSelectNode('queue')}
          className={`cursor-pointer border rounded-xl p-3 flex flex-col justify-between transition-all shadow-sm hover:border-amber-400 ${
            config.queue.enabled
              ? 'bg-slate-900/80 border-amber-500/30'
              : 'bg-slate-900/30 border-slate-800 opacity-60'
          }`}
          title="Click to configure Message Queue"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Video size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white">
                  {config.queue.enabled ? 'Message Queue (BullMQ)' : 'No Queue (Synchronous)'}
                </span>
                <div className="text-[11px] text-slate-400">
                  {config.queue.enabled ? 'Offloads heavy render & export jobs' : 'Heavy jobs block web threads!'}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                config.queue.enabled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {config.queue.enabled ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          {config.queue.enabled ? (
            <div className="flex justify-between text-xs text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span>Queue Depth: <strong className="text-amber-400">{config.queue.queueDepth} jobs</strong></span>
              <span>Wait: <strong className="text-amber-300 font-mono">{Math.round((config.queue.queueDepth / Math.max(1, config.queue.processingRate)) * 1000)}ms</strong></span>
              <span>Processing: <strong className="text-slate-200">{config.queue.processingRate}/sec</strong></span>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-rose-400/90 mb-2 bg-rose-950/20 p-1.5 rounded border border-rose-900/30 flex items-center gap-1.5">
                <Notification size={12} className="text-rose-400 shrink-0" />
                <span>Synchronous jobs: heavy video tasks block web threads.</span>
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddComponentModal();
                }}
                className="w-full py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Add size={12} />
                <span>Add Message Queue & Worker</span>
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Background Workers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Factory size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">
                Queue Workers ({workerServers.length})
              </span>
            </div>
            <button
              onClick={() => onAddServer('worker')}
              className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Add size={12} />
              <span>Add Worker</span>
            </button>
          </div>

          {workerServers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workerServers.map((worker) => (
                <div
                  key={worker.id}
                  onClick={() => onSelectNode('server', worker.id)}
                  className="border border-slate-800 rounded p-2 bg-slate-900/90 hover:border-cyan-400 cursor-pointer text-xs"
                >
                  <div className="flex justify-between items-center mb-1 text-[11px]">
                    <span className="font-mono font-bold text-white">{worker.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteServer(worker.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                    >
                      <Delete size={11} />
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{worker.vCpu} vCPU • {(worker.customTechName || worker.verifiedInfo?.name || worker.techStack).toUpperCase()}</span>
                    <span className="font-semibold text-cyan-300">CPU {worker.cpuUtilization}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${worker.cpuUtilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-[11px] text-slate-500 bg-slate-950/40 rounded border border-dashed border-slate-800">
              No worker instances. Processing is forced onto web tier.
            </div>
          )}
        </div>
      </div>

      {/* 4. CACHE & DATABASE TIER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Redis Cache */}
        <div
          onClick={() => onSelectNode('cache')}
          className={`cursor-pointer border rounded-xl p-3 flex flex-col justify-between transition-all shadow-sm hover:border-rose-400 ${
            config.cache.enabled
              ? 'bg-slate-900/80 border-rose-500/30'
              : 'bg-slate-900/30 border-slate-800 opacity-60'
          }`}
          title="Click to configure Redis Cache"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Database size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white">In-Memory Cache (Redis)</span>
                <div className="text-[11px] text-slate-400">
                  {config.cache.enabled ? `${config.cache.memoryGb}GB Allocated` : 'Cache Disabled'}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                config.cache.enabled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {config.cache.enabled ? 'ON' : 'OFF'}
            </span>
          </div>

          {config.cache.enabled ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Hit Ratio:</span>
                <strong className="text-emerald-400">{config.cache.hitRatio}%</strong>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Lookup Latency:</span>
                <span className="text-amber-300 font-mono font-semibold">{config.cache.latencyMs ?? 0.6}ms</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${config.cache.hitRatio}%` }} />
              </div>
            </div>
          ) : (
            <div>
              <span className="text-[11px] text-slate-500 block mb-2">All queries hit database directly.</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddComponentModal();
                }}
                className="w-full py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Add size={12} />
                <span>Add Redis Cache</span>
              </button>
            </div>
          )}
        </div>

        {/* PostgreSQL Database */}
        <div
          onClick={() => onSelectNode('database')}
          className={`cursor-pointer md:col-span-2 border rounded-xl p-3 flex flex-col justify-between transition-all shadow-sm hover:border-blue-400 ${
            config.database.status === 'healthy'
              ? 'bg-slate-900/80 border-blue-500/30'
              : 'bg-rose-950/30 border-rose-500 shadow-rose-950/40 ring-1 ring-rose-500'
          }`}
          title="Click to configure Database & PgBouncer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Database size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {config.database.name} ({config.database.engine.toUpperCase()})
                  </span>
                  {config.database.hasConnectionPooler ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      PgBouncer Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                      No Pooler
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {config.database.vCpu} vCPU • {config.database.ramGb}GB RAM • {config.database.maxConnections} Max Conns
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                config.database.status === 'healthy'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-600 text-white border border-rose-500 animate-pulse'
              }`}
            >
              {config.database.status}
            </span>
          </div>

          {/* Connection Pool Meter & DB Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-400">Pool Saturation:</span>
                <span className={`font-bold ${config.database.connectionPoolUtilization >= 90 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                  {config.database.connectionPoolUtilization}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    config.database.connectionPoolUtilization >= 90
                      ? 'bg-rose-500'
                      : config.database.connectionPoolUtilization >= 75
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${config.database.connectionPoolUtilization}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-400">DB CPU:</span>
                <span className={`font-bold ${config.database.cpuUtilization > 80 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {config.database.cpuUtilization}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${config.database.cpuUtilization > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                  style={{ width: `${config.database.cpuUtilization}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex flex-col justify-center text-[11px] px-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Throughput:</span>
                <strong className="text-blue-300">{config.database.queriesPerSecond} QPS</strong>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-slate-400">Query Latency:</span>
                <strong className="text-amber-300 font-mono">{config.database.queryLatencyMs ?? 2.5}ms</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

