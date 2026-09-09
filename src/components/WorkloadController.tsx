import React, { useState } from 'react';
import {
  Users,
  Video,
  Document,
  Upload,
  Database,
  Analytics,
  Settings,
  ChevronDown,
  ChevronUp,
  Notification,
} from '@veasnawt/vicons';
import type { TrafficConfig, TrafficPattern } from '../types/simulation';

interface WorkloadControllerProps {
  traffic: TrafficConfig;
  onChangeTraffic: (newTraffic: TrafficConfig) => void;
  currentInstantRps: number;
}

export const WorkloadController: React.FC<WorkloadControllerProps> = ({
  traffic,
  onChangeTraffic,
  currentInstantRps,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const dist = traffic.distribution;

  const handleDistributionChange = (key: keyof typeof dist, value: number) => {
    const updated = { ...dist, [key]: value };
    onChangeTraffic({
      ...traffic,
      distribution: updated,
    });
  };

  const applyWorkloadPreset = (type: 'video_platform' | 'ecommerce' | 'analytics' | 'light_api') => {
    switch (type) {
      case 'video_platform':
        onChangeTraffic({
          ...traffic,
          baseRps: 450,
          pattern: 'spike',
          distribution: {
            normalApiPercent: 50,
            heavyQueryPercent: 15,
            videoRenderPercent: 25,
            fileUploadPercent: 8,
            pdfReportPercent: 2,
          },
        });
        break;
      case 'ecommerce':
        onChangeTraffic({
          ...traffic,
          baseRps: 1200,
          pattern: 'spike',
          spikeMultiplier: 4,
          distribution: {
            normalApiPercent: 45,
            heavyQueryPercent: 45,
            videoRenderPercent: 0,
            fileUploadPercent: 2,
            pdfReportPercent: 8,
          },
        });
        break;
      case 'analytics':
        onChangeTraffic({
          ...traffic,
          baseRps: 300,
          pattern: 'constant',
          distribution: {
            normalApiPercent: 20,
            heavyQueryPercent: 60,
            videoRenderPercent: 0,
            fileUploadPercent: 5,
            pdfReportPercent: 15,
          },
        });
        break;
      case 'light_api':
        onChangeTraffic({
          ...traffic,
          baseRps: 2500,
          pattern: 'constant',
          distribution: {
            normalApiPercent: 90,
            heavyQueryPercent: 8,
            videoRenderPercent: 0,
            fileUploadPercent: 2,
            pdfReportPercent: 0,
          },
        });
        break;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-3">
      {/* Compact Main Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Traffic Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Users size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">Traffic Workload</span>
              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/20">
                {currentInstantRps} RPS
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                ({traffic.pattern})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Presets & Tune Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 mr-1 hidden lg:inline">Quick Workload:</span>
          <button
            onClick={() => applyWorkloadPreset('video_platform')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 text-xs font-medium cursor-pointer transition-colors"
          >
            Video Transcoding
          </button>
          <button
            onClick={() => applyWorkloadPreset('ecommerce')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-amber-950/40 text-amber-300 border border-amber-900/40 text-xs font-medium cursor-pointer transition-colors"
          >
            E-Commerce
          </button>
          <button
            onClick={() => applyWorkloadPreset('analytics')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-cyan-950/40 text-cyan-300 border border-cyan-900/40 text-xs font-medium cursor-pointer transition-colors"
          >
            Analytics
          </button>
          <button
            onClick={() => applyWorkloadPreset('light_api')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 text-xs font-medium cursor-pointer transition-colors"
          >
            Light API
          </button>

          {/* Expand / Collapse Customizer */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 border transition-colors cursor-pointer ml-1 ${
              isExpanded
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Settings size={13} />
            <span>{isExpanded ? 'Hide Sliders' : 'Tune Sliders'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded Sliders & Settings (Collapsible) */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-3">

      {/* Traffic Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Base RPS Slider */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-medium">Base Inbound RPS:</span>
            <span className="font-bold text-indigo-400 text-sm">{traffic.baseRps} req/s</span>
          </div>
          <input
            type="range"
            min="10"
            max="8000"
            step="20"
            value={traffic.baseRps}
            onChange={(e) =>
              onChangeTraffic({ ...traffic, baseRps: Number(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>10 RPS (Dev)</span>
            <span>1,000 RPS (Mid)</span>
            <span>8,000+ RPS (High)</span>
          </div>
        </div>

        {/* Traffic Curve Pattern */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-medium">Traffic Curve:</span>
            <span className="text-slate-400 capitalize">{traffic.pattern}</span>
          </div>
          <select
            value={traffic.pattern}
            onChange={(e) =>
              onChangeTraffic({ ...traffic, pattern: e.target.value as TrafficPattern })
            }
            className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="constant">Constant Stream</option>
            <option value="sinusoidal">Sinusoidal (24h Day/Night Cycle)</option>
            <option value="spike">Periodic Flash Spike (3.5x)</option>
            <option value="ramp">Stress Test (Continuous Ramp-Up)</option>
            <option value="burst">Micro Burst (Random Jitter)</option>
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Simulates dynamic human user fluctuations over time.
          </p>
        </div>

        {/* Spike Multiplier */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-medium">Spike Intensity:</span>
            <span className="font-bold text-rose-400">{traffic.spikeMultiplier}x Multiplier</span>
          </div>
          <input
            type="range"
            min="1.5"
            max="10"
            step="0.5"
            value={traffic.spikeMultiplier}
            onChange={(e) =>
              onChangeTraffic({ ...traffic, spikeMultiplier: Number(e.target.value) })
            }
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1.5x (Mild)</span>
            <span>4x (Black Friday)</span>
            <span>10x (DDOS/Viral)</span>
          </div>
        </div>
      </div>

      {/* Workload Task Mix Sliders */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Settings size={14} className="text-slate-400" />
            User Task & Workload Mix Breakdown:
          </span>
          <span className="text-[11px] text-slate-400">
            Total Distribution: 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Normal API */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Database size={13} />
                Light API (CRUD)
              </span>
              <span className="font-bold text-slate-200">{dist.normalApiPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={dist.normalApiPercent}
              onChange={(e) => handleDistributionChange('normalApiPercent', Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              ~2ms CPU, 0.05MB RAM
            </span>
          </div>

          {/* Heavy Search / Aggregation */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Analytics size={13} />
                Heavy DB Query
              </span>
              <span className="font-bold text-slate-200">{dist.heavyQueryPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={dist.heavyQueryPercent}
              onChange={(e) => handleDistributionChange('heavyQueryPercent', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              ~25ms CPU, DB scan
            </span>
          </div>

          {/* Heavy Video Render */}
          <div className="bg-slate-950/40 border border-rose-900/40 rounded-lg p-2.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <Video size={13} />
                1080p Video Transcode
              </span>
              <span className="font-bold text-rose-300">{dist.videoRenderPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={dist.videoRenderPercent}
              onChange={(e) => handleDistributionChange('videoRenderPercent', Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-rose-400/90 mt-1 font-semibold flex items-center gap-1">
              <Notification size={10} className="text-rose-400 shrink-0" />
              <span>12,000ms CPU + 1.2GB RAM!</span>
            </span>
          </div>

          {/* File Uploads */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-cyan-400 font-medium flex items-center gap-1">
                <Upload size={13} />
                Media / Uploads
              </span>
              <span className="font-bold text-slate-200">{dist.fileUploadPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={dist.fileUploadPercent}
              onChange={(e) => handleDistributionChange('fileUploadPercent', Number(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              Network & Disk write
            </span>
          </div>

          {/* PDF Report Generation */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-purple-400 font-medium flex items-center gap-1">
                <Document size={13} />
                PDF Report Job
              </span>
              <span className="font-bold text-slate-200">{dist.pdfReportPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={dist.pdfReportPercent}
              onChange={(e) => handleDistributionChange('pdfReportPercent', Number(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              1,500ms CPU burst
            </span>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
};
