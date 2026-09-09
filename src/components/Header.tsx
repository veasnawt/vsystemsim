import React from 'react';
import { Play, Pause, Refresh, TrendUp, Art, BarChart, Bug, Notification } from '@veasnawt/vicons';
import type { SimulationMetrics } from '../types/simulation';

interface HeaderProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  currentRps: number;
  baseRps: number;
  onChangeBaseRps: (rps: number) => void;
  networkLatencyMs: number;
  onChangeNetworkLatency: (latency: number) => void;
  isSpikeActive: boolean;
  onToggleSpike: () => void;
  metrics: SimulationMetrics | null;
  serverCount: number;
  viewMode: 'playground' | 'architecture';
  onChangeViewMode: (mode: 'playground' | 'architecture') => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePlay,
  onReset,
  currentRps,
  baseRps,
  onChangeBaseRps,
  networkLatencyMs,
  onChangeNetworkLatency,
  isSpikeActive,
  onToggleSpike,
  metrics,
  serverCount,
  viewMode,
  onChangeViewMode,
}) => {
  const errorRate =
    metrics && metrics.totalInboundRps > 0
      ? Math.round((metrics.errorRps / metrics.totalInboundRps) * 100)
      : 0;

  const isHealthy = errorRate < 5 && (!metrics || metrics.averageRamPercent < 90);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5">
      <div className={`${viewMode === 'playground' ? 'w-full px-1' : 'max-w-7xl'} mx-auto flex items-center justify-between gap-4 flex-wrap`}>
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30">
            VS
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>VSystemSim</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                v2.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 m-0">Interactive System Design & Physics Simulator</p>
          </div>
        </div>

        {/* Center: Simplified Traffic Dial */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Traffic:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onChangeBaseRps(Math.max(20, baseRps - 100))}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              title="Decrease Traffic"
            >
              -
            </button>
            <input
              type="number"
              value={baseRps}
              onChange={(e) => onChangeBaseRps(Math.max(1, Number(e.target.value)))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => onChangeBaseRps(baseRps + 200)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              title="Increase Traffic"
            >
              +
            </button>
            <span className="text-[11px] font-bold text-indigo-400">
              ({currentRps} RPS)
            </span>
          </div>

          {/* Quick RPS Chips */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
            {[100, 500, 2000].map((rps) => (
              <button
                key={rps}
                onClick={() => onChangeBaseRps(rps)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  baseRps === rps
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {rps}
              </button>
            ))}
          </div>

          {/* Spike Toggle */}
          <button
            onClick={onToggleSpike}
            className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
              isSpikeActive
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
            }`}
            title="Simulate sudden 3.5x traffic surge"
          >
            <TrendUp size={12} className={isSpikeActive ? 'text-white' : 'text-rose-400'} />
            <span>Spike</span>
          </button>
        </div>

        {/* Latency Stepper & Presets */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:inline">
            Latency:
          </span>

          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onChangeNetworkLatency(Math.max(1, networkLatencyMs - 10))}
              className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-bold text-xs rounded hover:bg-slate-800 cursor-pointer"
              title="Decrease Latency"
            >
              -
            </button>
            <span className="font-mono text-xs font-bold text-amber-300 w-11 text-center">
              {networkLatencyMs}ms
            </span>
            <button
              onClick={() => onChangeNetworkLatency(Math.min(500, networkLatencyMs + 10))}
              className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-bold text-xs rounded hover:bg-slate-800 cursor-pointer"
              title="Increase Latency"
            >
              +
            </button>
          </div>

          {/* Quick Presets */}
          <div className="hidden xl:flex items-center gap-1 pl-1.5 border-l border-slate-800">
            {[
              { val: 5, label: '5ms' },
              { val: 20, label: '20ms' },
              { val: 80, label: '80ms' },
              { val: 160, label: '160ms' },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => onChangeNetworkLatency(p.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  networkLatencyMs === p.val
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white border border-transparent'
                }`}
                title={`Set network latency to ${p.val}ms`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center-Right: Mode Switcher (Playground vs Overview) */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 p-0.5 rounded-xl shadow-inner">
          <button
            type="button"
            onClick={() => onChangeViewMode('playground')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'playground'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Interactive Visual Playground: Drag nodes and wire connections with animated physics"
          >
            <Art size={13} />
            <span>Playground</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('architecture')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'architecture'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Structured Architecture Overview: Grid tier layout"
          >
            <BarChart size={13} />
            <span>Overview</span>
          </button>
        </div>

        {/* Right: Simulation Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1.5 ${
              serverCount === 0
                ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                : isHealthy
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                serverCount === 0
                  ? 'bg-slate-500'
                  : isHealthy
                  ? 'bg-emerald-400'
                  : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className="flex items-center gap-1">
              {serverCount === 0 ? (
                'Empty Canvas'
              ) : isHealthy ? (
                `Healthy • ${metrics?.p50LatencyMs ?? networkLatencyMs}ms (p95: ${metrics?.p95LatencyMs ?? networkLatencyMs * 2}ms)`
              ) : errorRate > 0 ? (
                <>
                  <span>{errorRate}% Errors</span>
                  <Bug size={12} className="inline text-rose-400" />
                  <span>({metrics?.p50LatencyMs ?? 0}ms)</span>
                </>
              ) : (
                <>
                  <span>Degraded • {metrics?.p50LatencyMs ?? 0}ms</span>
                  <Notification size={12} className="inline text-rose-400" />
                </>
              )}
            </span>
          </div>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg border text-white cursor-pointer transition-all shadow-sm ${
              isRunning
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white'
            }`}
            title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Reset to Blank Canvas"
          >
            <Refresh size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
