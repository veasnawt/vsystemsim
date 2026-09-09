import React, { useState } from 'react';
import {
  Close,
  Check,
  Settings,
} from '@veasnawt/vicons';
import type {
  ArchitectureConfig,
  DatabaseConfig,
  HostingProvider,
  ServerInstance,
  StorageType,
  TechStack,
} from '../types/simulation';

interface NodeConfigModalProps {
  nodeType: 'server' | 'database' | 'cache' | 'queue' | 'loadBalancer';
  nodeId?: string;
  config: ArchitectureConfig;
  onClose: () => void;
  onSaveConfig: (updatedConfig: ArchitectureConfig) => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  nodeType,
  nodeId,
  config,
  onClose,
  onSaveConfig,
}) => {
  // Server state
  const initialServer = config.servers.find((s) => s.id === nodeId) || config.servers[0];
  const [server, setServer] = useState<ServerInstance>({ ...initialServer });

  // Database state
  const [db, setDb] = useState<DatabaseConfig>({ ...config.database });

  // Cache state
  const [cache, setCache] = useState({ ...config.cache });

  // Queue state
  const [queue, setQueue] = useState({ ...config.queue });

  // Load Balancer state
  const [lb, setLb] = useState({ ...config.loadBalancer });

  const handleSave = () => {
    let updated = { ...config };

    if (nodeType === 'server') {
      updated.servers = updated.servers.map((s) => (s.id === server.id ? server : s));
    } else if (nodeType === 'database') {
      updated.database = db;
    } else if (nodeType === 'cache') {
      updated.cache = cache;
    } else if (nodeType === 'queue') {
      updated.queue = queue;
    } else if (nodeType === 'loadBalancer') {
      updated.loadBalancer = lb;
    }

    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0 capitalize">
                Configure {nodeType === 'loadBalancer' ? 'Load Balancer' : nodeType}
              </h3>
              <span className="text-[11px] text-slate-400">
                Adjust realistic hardware specifications and architectural parameters
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Close size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* SERVER CONFIGURATION */}
          {nodeType === 'server' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Server Name:</label>
                <input
                  type="text"
                  value={server.name}
                  onChange={(e) => setServer({ ...server, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Hosting Provider:</label>
                  <select
                    value={server.provider}
                    onChange={(e) => setServer({ ...server, provider: e.target.value as HostingProvider })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="aws">AWS (EC2)</option>
                    <option value="gcp">Google Cloud Platform</option>
                    <option value="digitalocean">DigitalOcean</option>
                    <option value="hetzner">Hetzner Cloud</option>
                    <option value="baremetal">Bare Metal Server</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Server Role:</label>
                  <select
                    value={server.role}
                    onChange={(e) =>
                      setServer({ ...server, role: e.target.value as ServerInstance['role'] })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="api_server">API / Web Server</option>
                    <option value="worker">Dedicated Background Worker</option>
                    <option value="monolith">Monolith (API + Heavy Jobs)</option>
                  </select>
                </div>
              </div>

              {/* Hardware Specs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">vCPU Cores:</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={server.vCpu}
                    onChange={(e) => setServer({ ...server, vCpu: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">RAM (GB):</label>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    value={server.ramGb}
                    onChange={(e) => setServer({ ...server, ramGb: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Storage (GB):</label>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    value={server.storageGb}
                    onChange={(e) =>
                      setServer({ ...server, storageGb: Math.max(10, Number(e.target.value)) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Storage Type:</label>
                  <select
                    value={server.storageType}
                    onChange={(e) =>
                      setServer({ ...server, storageType: e.target.value as StorageType })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="nvme">NVMe SSD (15,000 IOPS)</option>
                    <option value="ssd">SATA SSD (3,000 IOPS)</option>
                    <option value="ebs_gp3">AWS EBS gp3 (3,000 IOPS)</option>
                    <option value="hdd">Standard HDD (100 IOPS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tech Stack Runtime:</label>
                  <select
                    value={server.techStack}
                    onChange={(e) =>
                      setServer({ ...server, techStack: e.target.value as TechStack })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="nodejs">Node.js (Single Thread Event Loop)</option>
                    <option value="python">Python FastAPI (GIL / Gunicorn)</option>
                    <option value="go">Golang (Goroutines / Fast)</option>
                    <option value="rust">Rust (Tokio / Zero Cost)</option>
                    <option value="java">Java (Spring Boot / JVM)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* DATABASE CONFIGURATION */}
          {nodeType === 'database' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Database Engine:</label>
                  <select
                    value={db.engine}
                    onChange={(e) => setDb({ ...db, engine: e.target.value as DatabaseConfig['engine'] })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="postgres">PostgreSQL 16</option>
                    <option value="mysql">MySQL 8.0</option>
                    <option value="mongodb">MongoDB 7.0</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Max Connections Limit:</label>
                  <input
                    type="number"
                    min="20"
                    max="2000"
                    step="10"
                    value={db.maxConnections}
                    onChange={(e) =>
                      setDb({ ...db, maxConnections: Math.max(20, Number(e.target.value)) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              {/* Hardware Specs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">vCPU:</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={db.vCpu}
                    onChange={(e) => setDb({ ...db, vCpu: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">RAM (GB):</label>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    value={db.ramGb}
                    onChange={(e) => setDb({ ...db, ramGb: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Storage (GB):</label>
                  <input
                    type="number"
                    min="20"
                    max="5000"
                    value={db.storageGb}
                    onChange={(e) => setDb({ ...db, storageGb: Math.max(20, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              {/* PgBouncer & Replicas */}
              <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Connection Pooler (PgBouncer)</span>
                    <span className="text-[11px] text-slate-400">
                      Multiplexes web connections to prevent DB connection pool exhaustion.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={db.hasConnectionPooler}
                    onChange={(e) => setDb({ ...db, hasConnectionPooler: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="font-semibold text-white block">Read Replicas</span>
                    <span className="text-[11px] text-slate-400">
                      Distribute read and analytics queries across replica nodes.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={db.hasReadReplica}
                      onChange={(e) => setDb({ ...db, hasReadReplica: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                    {db.hasReadReplica && (
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={db.replicaCount}
                        onChange={(e) =>
                          setDb({ ...db, replicaCount: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CACHE CONFIGURATION */}
          {nodeType === 'cache' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="font-semibold text-white block">Enable Redis Cache</span>
                  <span className="text-[11px] text-slate-400">
                    Caches read queries in memory for &lt;1ms responses.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cache.enabled}
                  onChange={(e) => setCache({ ...cache, enabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer"
                />
              </div>

              {cache.enabled && (
                <>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Cache Memory (GB):</label>
                    <input
                      type="number"
                      min="1"
                      max="64"
                      value={cache.memoryGb}
                      onChange={(e) =>
                        setCache({ ...cache, memoryGb: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Expected Cache Hit Ratio:</label>
                      <span className="font-bold text-emerald-400">{cache.hitRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="99"
                      value={cache.hitRatio}
                      onChange={(e) => setCache({ ...cache, hitRatio: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* MESSAGE QUEUE CONFIGURATION */}
          {nodeType === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="font-semibold text-white block">Enable Async Message Queue</span>
                  <span className="text-[11px] text-slate-400">
                    Buffers heavy video transcoding and batch tasks away from web servers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={queue.enabled}
                  onChange={(e) => setQueue({ ...queue, enabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {queue.enabled && (
                <>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Broker Type:</label>
                    <select
                      value={queue.type}
                      onChange={(e) =>
                        setQueue({ ...queue, type: e.target.value as typeof queue.type })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    >
                      <option value="redis_bullmq">Redis (BullMQ)</option>
                      <option value="sqs">AWS SQS (Simple Queue Service)</option>
                      <option value="rabbitmq">RabbitMQ</option>
                      <option value="kafka">Apache Kafka</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Worker Fleet Processing Rate (jobs/sec):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={queue.processingRate}
                      onChange={(e) =>
                        setQueue({ ...queue, processingRate: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* LOAD BALANCER CONFIGURATION */}
          {nodeType === 'loadBalancer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="font-semibold text-white block">Enable Load Balancer</span>
                  <span className="text-[11px] text-slate-400">
                    Distributes incoming traffic across healthy web instances.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={lb.enabled}
                  onChange={(e) => setLb({ ...lb, enabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Balancing Algorithm:</label>
                <select
                  value={lb.algorithm}
                  onChange={(e) =>
                    setLb({ ...lb, algorithm: e.target.value as typeof lb.algorithm })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="least_conn">Least Connections</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Rate Limit (Max RPS allowed, 0 = unlimited):
                </label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  step="500"
                  value={lb.rateLimitRps}
                  onChange={(e) => setLb({ ...lb, rateLimitRps: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Check size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
