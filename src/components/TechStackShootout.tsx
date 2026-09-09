import React from 'react';
import {
  Code,
  Check,
  Desktop,
  Notification,
} from '@veasnawt/vicons';
import type { TechStack } from '../types/simulation';

interface TechStackShootoutProps {
  currentTechStack: TechStack;
  onApplyTechStack: (tech: TechStack) => void;
}

interface StackDetail {
  id: TechStack;
  name: string;
  runtime: string;
  concurrencyModel: string;
  memoryPerConn: string;
  baseMemoryFootprint: string;
  cpuBoundBehavior: string;
  strengths: string;
  weaknesses: string;
  idealFor: string;
  benchmarkScoreRps: string;
  color: string;
}

const TECH_STACKS: StackDetail[] = [
  {
    id: 'go',
    name: 'Golang (Gin / Fiber)',
    runtime: 'Compiled native binary + Go runtime scheduler',
    concurrencyModel: 'Lightweight Goroutines (M:N preemptive scheduler)',
    memoryPerConn: '~2KB - 4KB per connection',
    baseMemoryFootprint: '~30MB - 50MB',
    cpuBoundBehavior: 'True parallel multi-core execution across all GOMAXPROCS without blocking I/O.',
    strengths: 'Blazing fast startup, ultra-low memory overhead, seamless concurrency for 100k+ connections.',
    weaknesses: 'Garbage collector (though microsecond pause times), lacks advanced generic metaprogramming.',
    idealFor: 'High-throughput API gateways, microservices, distributed queues, networking services.',
    benchmarkScoreRps: '~45,000 req/s per 4 vCPU',
    color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400',
  },
  {
    id: 'rust',
    name: 'Rust (Axum / Actix-web)',
    runtime: 'Bare-metal compiled binary + Tokio async runtime',
    concurrencyModel: 'Async/await with Tokio work-stealing thread pool, Zero-cost abstractions',
    memoryPerConn: '< 1KB per connection (minimal heap overhead)',
    baseMemoryFootprint: '~15MB - 25MB',
    cpuBoundBehavior: 'Direct OS multi-threading (Rayon / Tokio tasks) with maximum CPU instruction efficiency.',
    strengths: 'Highest raw throughput, zero GC pauses, zero memory leaks, fearless memory safety without GC.',
    weaknesses: 'Steep borrow checker learning curve, slower compilation times.',
    idealFor: 'High-frequency trading, video transcoding engines (FFmpeg pipelines), critical edge services.',
    benchmarkScoreRps: '~65,000 req/s per 4 vCPU',
    color: 'border-orange-500/50 bg-orange-950/20 text-orange-400',
  },
  {
    id: 'nodejs',
    name: 'Node.js (Fastify / Express)',
    runtime: 'V8 JavaScript Engine + libuv C++ event loop',
    concurrencyModel: 'Single-threaded event loop with non-blocking I/O worker pool',
    memoryPerConn: '~25KB - 45KB per connection',
    baseMemoryFootprint: '~80MB - 140MB',
    cpuBoundBehavior: 'BLOCKS THE EVENT LOOP! Synchronous CPU tasks freeze all pending I/O and HTTP requests.',
    strengths: 'Massive npm ecosystem, rapid prototyping, shared TypeScript fullstack codebase.',
    weaknesses: 'Single-threaded CPU bottleneck; high risk of 504 timeouts if video/CPU tasks run in main thread.',
    idealFor: 'I/O-heavy REST APIs, GraphQL servers, real-time WebSocket messaging, BFF layers.',
    benchmarkScoreRps: '~18,000 req/s per 4 vCPU',
    color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400',
  },
  {
    id: 'python',
    name: 'Python (FastAPI / Gunicorn)',
    runtime: 'CPython + Uvicorn ASGI / Gunicorn multi-process',
    concurrencyModel: 'asyncio event loop per worker process; limited by Global Interpreter Lock (GIL)',
    memoryPerConn: '~50KB - 80KB per connection',
    baseMemoryFootprint: '~60MB per worker process (e.g. 4 workers = ~250MB)',
    cpuBoundBehavior: 'GIL locks Python bytecode execution to 1 OS thread per process; requires Celery/multiprocessing.',
    strengths: 'Unbeatable AI/ML/Data Science ecosystem, clean syntax, fastest time-to-market.',
    weaknesses: 'Lower raw RPS throughput per core, higher memory footprint per worker process.',
    idealFor: 'AI/ML inference APIs, analytics backends, developer tools, rapid MVPs.',
    benchmarkScoreRps: '~10,000 req/s per 4 vCPU',
    color: 'border-blue-500/50 bg-blue-950/20 text-blue-400',
  },
  {
    id: 'java',
    name: 'Java (Spring Boot 3 / Loom)',
    runtime: 'OpenJDK HotSpot JVM + JIT compiler',
    concurrencyModel: 'Virtual Threads (Project Loom) or traditional OS thread pool',
    memoryPerConn: '~5KB with Virtual Threads (was ~1MB with OS threads)',
    baseMemoryFootprint: '~350MB - 600MB (JVM Metaspace + Heap)',
    cpuBoundBehavior: 'Parallel multi-threading via ForkJoinPool; GC pauses can introduce tail latency spikes.',
    strengths: 'Enterprise-grade maturity, battle-tested connection poolers, robust transactional libraries.',
    weaknesses: 'Heavier baseline memory consumption, slower cold starts on container spin-up.',
    idealFor: 'Enterprise transactional core banking, large-scale distributed enterprise backends.',
    benchmarkScoreRps: '~32,000 req/s per 4 vCPU',
    color: 'border-red-500/50 bg-red-950/20 text-red-400',
  },
];

export const TechStackShootout: React.FC<TechStackShootoutProps> = ({
  currentTechStack,
  onApplyTechStack,
}) => {
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Code size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight m-0">
              Tech Stack Concurrency & Performance Shootout
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Explore how each runtime architecture behaves under heavy load, how it handles CPU vs I/O tasks,
              and why choosing the wrong stack for heavy video rendering or high RPS causes catastrophic server failure.
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECH_STACKS.map((stack) => {
          const isSelected = currentTechStack === stack.id;
          return (
            <div
              key={stack.id}
              className={`border rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-slate-900'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white m-0 flex items-center gap-2">
                      {stack.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                      {stack.runtime}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold">
                      Active
                    </span>
                  )}
                </div>

                {/* Characteristics */}
                <div className="space-y-2.5 text-xs text-slate-300 my-4">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Concurrency Model:
                    </span>
                    <span className="font-semibold text-white">{stack.concurrencyModel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Memory / Conn:</span>
                      <strong className="text-cyan-300">{stack.memoryPerConn}</strong>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Base RAM:</span>
                      <strong className="text-purple-300">{stack.baseMemoryFootprint}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                    <span className="text-rose-400 font-bold mb-0.5 flex items-center gap-1">
                      <Notification size={11} className="text-rose-400 shrink-0" />
                      <span>CPU-Bound Task Handling:</span>
                    </span>
                    <p className="text-slate-300 m-0 leading-relaxed">
                      {stack.cpuBoundBehavior}
                    </p>
                  </div>

                  <div className="text-[11px]">
                    <strong className="text-emerald-400">Ideal For: </strong>
                    <span className="text-slate-300">{stack.idealFor}</span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <strong>Relative Throughput: </strong>
                    <span className="text-indigo-300 font-semibold">{stack.benchmarkScoreRps}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onApplyTechStack(stack.id)}
                disabled={isSelected}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                {isSelected ? <Check size={14} /> : <Desktop size={14} />}
                <span>{isSelected ? 'Currently Applied' : `Apply ${stack.id.toUpperCase()} to Cluster`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
