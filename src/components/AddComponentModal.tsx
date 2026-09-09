import React, { useState, useEffect } from 'react';
import {
  Close,
  Desktop,
  Database,
  Globe,
  Video,
  Add,
  Check,
  Star,
} from '@veasnawt/vicons';
import { verifyTechStack, verifyHostingProvider } from '../engine/webVerifier';
import type { WebVerifiedInfo, ProviderVerifiedInfo } from '../engine/webVerifier';
import type {
  ArchitectureConfig,
  CacheConfig,
  DatabaseConfig,
  HostingProvider,
  LoadBalancerConfig,
  MessageQueueConfig,
  ServerInstance,
  TechStack,
} from '../types/simulation';

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ArchitectureConfig;
  onAddServer: (server: ServerInstance) => void;
  onConfigureDatabase: (db: DatabaseConfig) => void;
  onConfigureCache: (cache: CacheConfig) => void;
  onConfigureQueue: (queue: MessageQueueConfig, worker?: ServerInstance) => void;
  onConfigureLoadBalancer: (lb: LoadBalancerConfig) => void;
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
  config,
  onAddServer,
  onConfigureDatabase,
  onConfigureCache,
  onConfigureQueue,
}) => {
  const [tab, setTab] = useState<'server' | 'database' | 'cache' | 'queue'>('server');

  // Server Input State
  const [techInput, setTechInput] = useState<string>('Bun');
  const [providerInput, setProviderInput] = useState<string>('Fly.io');
  const [vCpu, setVCpu] = useState<number>(2);
  const [ramGb, setRamGb] = useState<number>(4);

  // Web Verification State
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedTech, setVerifiedTech] = useState<WebVerifiedInfo | null>(null);
  const [verifiedProvider, setVerifiedProvider] = useState<ProviderVerifiedInfo | null>(null);

  // Database State
  const [dbEngine, setDbEngine] = useState<'postgres' | 'mysql' | 'mongodb'>('postgres');
  const [dbProvider, setDbProvider] = useState<string>('AWS RDS');
  const [hasPgBouncer, setHasPgBouncer] = useState<boolean>(true);

  // Cache State
  const [cacheMemoryGb, setCacheMemoryGb] = useState<number>(2);

  // Queue State
  const [withWorker, setWithWorker] = useState<boolean>(true);

  // Trigger web verification when inputs change
  useEffect(() => {
    if (!isOpen || tab !== 'server') return;

    let active = true;

    const timer = setTimeout(async () => {
      setIsVerifying(true);
      try {
        const [techResult, providerResult] = await Promise.all([
          verifyTechStack(techInput || 'Node.js'),
          verifyHostingProvider(providerInput || 'AWS'),
        ]);

        if (active) {
          setVerifiedTech(techResult);
          setVerifiedProvider(providerResult);
        }
      } catch (err) {
        console.error('Web verification error:', err);
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, tab, techInput, providerInput]);

  if (!isOpen) return null;

  // Handler: Add Web Server with Verified Specs
  const handleDeployServer = () => {
    const count = config.servers.filter((s) => s.role !== 'worker').length + 1;
    const baseRam = verifiedTech ? verifiedTech.baseRamMb : 120;
    const techName = verifiedTech ? verifiedTech.name : techInput;
    const hostName = verifiedProvider ? verifiedProvider.name : providerInput;

    const newServer: ServerInstance = {
      id: `server-${Date.now()}`,
      name: `api-${count.toString().padStart(2, '0')}`,
      role: 'api_server',
      provider: hostName.toLowerCase() as HostingProvider,
      instanceType: `${hostName}-${vCpu}c-${ramGb}g`,
      vCpu,
      ramGb,
      storageGb: 40,
      storageType: 'nvme',
      techStack: techName.toLowerCase() as TechStack,
      customTechName: techName,
      customProviderName: hostName,
      verifiedInfo: verifiedTech || undefined,
      workersCount: 2,
      status: 'healthy',
      cpuUtilization: 10,
      ramUsedMb: baseRam,
      ramUtilization: Math.round((baseRam / (ramGb * 1024)) * 100),
      storageUsedGb: 5,
      storageUtilization: 12,
      diskIopsUsed: 50,
      diskIopsLimit: 5000,
      activeConnections: 5,
      eventLoopLagMs: verifiedTech?.runtimeType === 'event_loop' ? 1.5 : 0,
      threadsBusy: 1,
      threadsTotal: vCpu * 2,
      uptimeSeconds: 0,
      restartCountdown: 0,
      totalCrashes: 0,
      crashReason: null,
    };

    onAddServer(newServer);
    onClose();
  };

  // Handler: Add Database
  const handleDeployDatabase = () => {
    const updatedDb: DatabaseConfig = {
      ...config.database,
      engine: dbEngine,
      name: `${dbEngine}-primary`,
      provider: dbProvider.toLowerCase() as HostingProvider,
      hasConnectionPooler: hasPgBouncer,
      poolerCapacity: hasPgBouncer ? 1000 : 100,
      status: 'healthy',
    };
    onConfigureDatabase(updatedDb);
    onClose();
  };

  // Handler: Add Redis Cache
  const handleDeployCache = () => {
    const updatedCache: CacheConfig = {
      enabled: true,
      engine: 'redis',
      memoryGb: cacheMemoryGb,
      hitRatio: 88,
      status: 'healthy',
      ramUsedMb: Math.round(cacheMemoryGb * 1024 * 0.25),
    };
    onConfigureCache(updatedCache);
    onClose();
  };

  // Handler: Add Message Queue
  const handleDeployQueue = () => {
    const updatedQueue: MessageQueueConfig = {
      enabled: true,
      type: 'redis_bullmq',
      queueDepth: 0,
      processingRate: 25,
      deadLetterCount: 0,
      status: 'healthy',
    };

    let worker: ServerInstance | undefined = undefined;
    if (withWorker) {
      worker = {
        id: `worker-${Date.now()}`,
        name: 'worker-01',
        role: 'worker',
        provider: 'aws',
        instanceType: 'aws-2c-4g',
        vCpu: 2,
        ramGb: 4,
        storageGb: 40,
        storageType: 'nvme',
        techStack: 'rust',
        workersCount: 2,
        status: 'healthy',
        cpuUtilization: 10,
        ramUsedMb: 60,
        ramUtilization: 5,
        storageUsedGb: 5,
        storageUtilization: 12,
        diskIopsUsed: 80,
        diskIopsLimit: 5000,
        activeConnections: 2,
        eventLoopLagMs: 0,
        threadsBusy: 1,
        threadsTotal: 4,
        uptimeSeconds: 0,
        restartCountdown: 0,
        totalCrashes: 0,
        crashReason: null,
      };
    }

    onConfigureQueue(updatedQueue, worker);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Add Architecture Component</h3>
            <p className="text-xs text-slate-400 m-0">Choose or type custom tech — verified from the web.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <Close size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 p-2 bg-slate-950/40 border-b border-slate-800 gap-1 text-xs">
          {[
            { id: 'server', label: 'Server / API', icon: Desktop },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'cache', label: 'Redis Cache', icon: Globe },
            { id: 'queue', label: 'Queue', icon: Video },
          ].map((c) => {
            const IconComponent = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setTab(c.id as any)}
                className={`py-2 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === c.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <IconComponent size={14} />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: SERVER / API */}
          {tab === 'server' && (
            <div className="space-y-4">
              {/* Tech Stack Input */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  1. Tech Stack (Framework / Runtime):
                </label>
                {/* Popular chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Bun', 'Golang', 'Rust', 'Node.js', 'Python', 'Elixir'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTechInput(t)}
                      className={`px-2.5 py-1 rounded-md font-mono text-[11px] cursor-pointer transition-colors ${
                        techInput.toLowerCase() === t.toLowerCase()
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {/* Custom text input */}
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Or type custom: Elysia, Hono, Django, Rails, Spring, Zig..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Hosting Provider Input */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  2. Cloud Hosting Provider:
                </label>
                {/* Popular chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Fly.io', 'AWS', 'Hetzner', 'GCP', 'DigitalOcean', 'Railway', 'Vercel'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProviderInput(p)}
                      className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-colors ${
                        providerInput.toLowerCase() === p.toLowerCase()
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {/* Custom text input */}
                <input
                  type="text"
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value)}
                  placeholder="Or type custom: Cloudflare, Render, Supabase, Scaleway..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Hardware Specs */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  3. Hardware Specifications:
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block mb-1 text-[11px]">vCPU Cores:</span>
                    <div className="flex gap-1">
                      {[1, 2, 4, 8].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setVCpu(c)}
                          className={`flex-1 py-1 rounded text-center font-mono cursor-pointer ${
                            vCpu === c
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {c}c
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1 text-[11px]">RAM Memory:</span>
                    <div className="flex gap-1">
                      {[1, 2, 4, 8, 16].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setRamGb(g)}
                          className={`flex-1 py-1 rounded text-center font-mono cursor-pointer ${
                            ramGb === g
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {g}G
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Web Verification Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-300">Live Web Verification:</span>
                    {isVerifying ? (
                      <span className="text-[10px] text-indigo-400 animate-pulse">
                        Searching GitHub & Wikipedia...
                      </span>
                    ) : verifiedTech ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                        <Check size={10} />
                        <span>Verified</span>
                      </span>
                    ) : null}
                  </div>
                  {verifiedTech?.stars ? (
                    <span className="text-[10px] text-amber-400 font-mono inline-flex items-center gap-1">
                      <Star size={10} className="text-amber-400" />
                      <span>{verifiedTech.stars.toLocaleString()}</span>
                    </span>
                  ) : null}
                </div>

                {verifiedTech && (
                  <div className="space-y-1 text-[11px]">
                    <p className="text-slate-300 m-0 line-clamp-2 italic">
                      "{verifiedTech.summary}"
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                      <span className="text-indigo-300">{verifiedTech.concurrencyModel}</span>
                      <span>•</span>
                      <span>Base RAM: {verifiedTech.baseRamMb}MB</span>
                      <span>•</span>
                      <span>~{verifiedTech.maxRpsPerCore.toLocaleString()} RPS/core</span>
                    </div>
                    {verifiedProvider && (
                      <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/60 flex justify-between">
                        <span>Cloud: <strong className="text-slate-200">{verifiedProvider.name}</strong></span>
                        <span>Est: ~${verifiedProvider.costPerVcpuMonth * vCpu + verifiedProvider.costPerGbRamMonth * ramGb}/mo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deploy Button */}
              <button
                type="button"
                onClick={handleDeployServer}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Add size={16} />
                <span>Deploy {verifiedTech?.name || techInput} on {verifiedProvider?.name || providerInput}</span>
              </button>
            </div>
          )}

          {/* TAB 2: DATABASE */}
          {tab === 'database' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Database Engine:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'postgres', label: 'PostgreSQL', desc: 'Relational ACID' },
                    { id: 'mysql', label: 'MySQL 8.0', desc: 'Fast reads' },
                    { id: 'mongodb', label: 'MongoDB', desc: 'Document store' },
                  ].map((db) => (
                    <button
                      key={db.id}
                      type="button"
                      onClick={() => setDbEngine(db.id as any)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        dbEngine === db.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <strong className="block text-white text-xs">{db.label}</strong>
                      <span className="text-[10px] text-slate-400">{db.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Managed Host:</label>
                <div className="grid grid-cols-4 gap-2">
                  {['AWS RDS', 'Supabase', 'GCP Cloud SQL', 'Hetzner'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDbProvider(p)}
                      className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                        dbProvider === p
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* PgBouncer checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPgBouncer}
                  onChange={(e) => setHasPgBouncer(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="text-slate-200 block text-xs">Enable PgBouncer Connection Pooler</strong>
                  <span className="text-[10px] text-slate-400">
                    Multiplexes thousands of client connections to prevent DB connection pool exhaustion.
                  </span>
                </div>
              </label>

              <button
                type="button"
                onClick={handleDeployDatabase}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Add size={16} />
                <span>Configure & Deploy Database</span>
              </button>
            </div>
          )}

          {/* TAB 3: CACHE */}
          {tab === 'cache' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Redis In-Memory Cache Size:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setCacheMemoryGb(gb)}
                      className={`p-3 rounded-lg border text-center font-mono cursor-pointer transition-all ${
                        cacheMemoryGb === gb
                          ? 'border-rose-500 bg-rose-950/40 text-white font-bold'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      <strong className="block text-sm text-white">{gb} GB</strong>
                      <span className="text-[10px] text-slate-400">~{gb * 25000} keys</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed m-0">
                Offloads up to 88% of read queries directly from memory, protecting database connection pools during high traffic surges.
              </p>

              <button
                type="button"
                onClick={handleDeployCache}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-rose-600/30"
              >
                <Add size={16} />
                <span>Deploy {cacheMemoryGb}GB Redis Cache</span>
              </button>
            </div>
          )}

          {/* TAB 4: QUEUE */}
          {tab === 'queue' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Message Queue Engine:</label>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="font-bold text-white text-xs mb-0.5">BullMQ (Redis-backed Queue)</div>
                  <p className="text-slate-400 text-[11px] m-0">
                    Asynchronously queues long-running tasks (transcoding, reports, exports) to prevent web worker thread blocking.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withWorker}
                  onChange={(e) => setWithWorker(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="text-slate-200 block text-xs">Deploy Dedicated Queue Worker Instance</strong>
                  <span className="text-[10px] text-slate-400">
                    Runs on an isolated instance so heavy background jobs never consume web server memory.
                  </span>
                </div>
              </label>

              <button
                type="button"
                onClick={handleDeployQueue}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-amber-600/30"
              >
                <Add size={16} />
                <span>Deploy Message Queue</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
