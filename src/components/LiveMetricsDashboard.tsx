import React from 'react';
import {
  Analytics,
  AreaChart,
  LineChart,
  Gauge,
  TrendDown,
  Database,
  Desktop,
} from '@veasnawt/vicons';
import type { SimulationMetrics } from '../types/simulation';

interface LiveMetricsDashboardProps {
  history: SimulationMetrics[];
  latestMetrics: SimulationMetrics | null;
}

export const LiveMetricsDashboard: React.FC<LiveMetricsDashboardProps> = ({
  history,
  latestMetrics,
}) => {
  // Take last 40 data points for smooth sparklines
  const points = history.slice(-40);
  const maxRps = Math.max(100, ...points.map((p) => p.totalInboundRps));
  const maxLatency = Math.max(50, ...points.map((p) => p.p99LatencyMs));

  // Helper to draw clean SVG polyline / area
  const renderSvgArea = (
    data: number[],
    maxVal: number,
    color: string,
    fillOpacity: string
  ) => {
    if (data.length < 2) return null;
    const width = 380;
    const height = 90;
    const step = width / (data.length - 1);

    const coords = data.map((val, idx) => {
      const x = idx * step;
      const y = height - (Math.min(val, maxVal) / Math.max(1, maxVal)) * (height - 8) - 4;
      return `${x},${y}`;
    });

    const pointsStr = coords.join(' ');
    const areaStr = `0,${height} ${pointsStr} ${width},${height}`;

    return (
      <svg className="w-full h-24 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polygon points={areaStr} fill={color} fillOpacity={fillOpacity} />
        <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total Inbound RPS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <Analytics size={13} className="text-indigo-400" />
            Inbound Traffic
          </div>
          <div className="text-xl font-extrabold text-white">
            {latestMetrics ? latestMetrics.totalInboundRps : 0}{' '}
            <span className="text-xs font-normal text-slate-400">RPS</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Success: <strong className="text-emerald-400">{latestMetrics?.successRps || 0}</strong>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <TrendDown size={13} className="text-rose-400" />
            Error Rate
          </div>
          <div
            className={`text-xl font-extrabold ${
              latestMetrics && latestMetrics.errorRps > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
            }`}
          >
            {latestMetrics && latestMetrics.totalInboundRps > 0
              ? Math.round((latestMetrics.errorRps / latestMetrics.totalInboundRps) * 100)
              : 0}
            %
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Errors: <strong className={latestMetrics?.errorRps ? 'text-rose-400' : 'text-slate-400'}>{latestMetrics?.errorRps || 0} RPS</strong>
          </div>
        </div>

        {/* p95 Latency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <LineChart size={13} className="text-cyan-400" />
            p95 Latency
          </div>
          <div
            className={`text-xl font-extrabold ${
              latestMetrics && latestMetrics.p95LatencyMs > 250
                ? 'text-rose-400'
                : latestMetrics && latestMetrics.p95LatencyMs > 100
                ? 'text-amber-400'
                : 'text-cyan-300'
            }`}
          >
            {latestMetrics?.p95LatencyMs || 0}{' '}
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            p99: <strong className="text-slate-300">{latestMetrics?.p99LatencyMs || 0}ms</strong>
          </div>
        </div>

        {/* Cluster CPU % */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <Desktop size={13} className="text-indigo-400" />
            Cluster Avg CPU
          </div>
          <div
            className={`text-xl font-extrabold ${
              latestMetrics && latestMetrics.averageCpuPercent > 80 ? 'text-rose-400' : 'text-indigo-300'
            }`}
          >
            {latestMetrics?.averageCpuPercent || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Compute Utilization
          </div>
        </div>

        {/* Cluster RAM % */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <Gauge size={13} className="text-purple-400" />
            Cluster Avg RAM
          </div>
          <div
            className={`text-xl font-extrabold ${
              latestMetrics && latestMetrics.averageRamPercent > 90
                ? 'text-rose-400 animate-pulse'
                : 'text-purple-300'
            }`}
          >
            {latestMetrics?.averageRamPercent || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            OOM Risk Threshold: 95%
          </div>
        </div>

        {/* DB Connection Saturation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
            <Database size={13} className="text-blue-400" />
            DB Pool Usage
          </div>
          <div
            className={`text-xl font-extrabold ${
              latestMetrics && latestMetrics.dbPoolSaturationPercent >= 85
                ? 'text-rose-400 animate-pulse'
                : 'text-blue-300'
            }`}
          >
            {latestMetrics?.dbPoolSaturationPercent || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Connection Slots
          </div>
        </div>
      </div>

      {/* 2. Graphical Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Throughput (Inbound vs Success vs Errors) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <AreaChart size={16} className="text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">
                Throughput (Requests / Second)
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Total Inbound
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Success (2xx)
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Errors (5xx)
              </span>
            </div>
          </div>
          <div className="h-28 flex items-end">
            {renderSvgArea(
              points.map((p) => p.totalInboundRps),
              maxRps,
              '#6366f1',
              '0.15'
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1">
            <span>Peak: {maxRps} RPS</span>
            <span>Current: {latestMetrics?.totalInboundRps || 0} RPS</span>
          </div>
        </div>

        {/* Chart 2: Latency Percentiles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <LineChart size={16} className="text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">
                Response Latency (ms)
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> p50
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> p95
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> p99
              </span>
            </div>
          </div>
          <div className="h-28 flex items-end">
            {renderSvgArea(
              points.map((p) => p.p95LatencyMs),
              maxLatency,
              '#06b6d4',
              '0.2'
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1">
            <span>p50: {latestMetrics?.p50LatencyMs || 0}ms</span>
            <span>p95: {latestMetrics?.p95LatencyMs || 0}ms</span>
            <span>p99 Peak: {maxLatency}ms</span>
          </div>
        </div>

        {/* Chart 3: Cluster CPU & RAM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">
                Cluster CPU & RAM Utilization (%)
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> CPU %
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> RAM %
              </span>
            </div>
          </div>
          <div className="h-28 flex items-end">
            {renderSvgArea(
              points.map((p) => p.averageCpuPercent),
              100,
              '#a855f7',
              '0.2'
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1">
            <span>0% Capacity</span>
            <span>Cluster Average: {latestMetrics?.averageCpuPercent || 0}%</span>
            <span>100% Saturated</span>
          </div>
        </div>

        {/* Chart 4: Database Connection Pool */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">
                Database Pool Saturation (%)
              </h4>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Max Connections
            </div>
          </div>
          <div className="h-28 flex items-end">
            {renderSvgArea(
              points.map((p) => p.dbPoolSaturationPercent),
              100,
              '#3b82f6',
              '0.2'
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1">
            <span>Warning Level: 80%</span>
            <span>Current: {latestMetrics?.dbPoolSaturationPercent || 0}%</span>
            <span>Exhaustion: 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
