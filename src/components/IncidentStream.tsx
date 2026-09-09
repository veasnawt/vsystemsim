import React, { useState } from 'react';
import {
  Terminal,
  Bug,
  Shield,
  Delete,
  Check,
} from '@veasnawt/vicons';
import type { IncidentLog } from '../types/simulation';

interface IncidentStreamProps {
  incidents: IncidentLog[];
  onClearIncidents: () => void;
}

export const IncidentStream: React.FC<IncidentStreamProps> = ({
  incidents,
  onClearIncidents,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const filteredIncidents = incidents.filter((item) => {
    if (filter === 'critical') return item.severity === 'critical' || item.severity === 'fatal';
    if (filter === 'warning') return item.severity === 'warning';
    return true;
  });

  const getSeverityBadge = (severity: IncidentLog['severity']) => {
    switch (severity) {
      case 'fatal':
        return 'bg-red-600 text-white font-bold border-red-500';
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 font-bold border-rose-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 font-semibold border-amber-500/30';
      case 'info':
      default:
        return 'bg-blue-500/20 text-blue-400 font-medium border-blue-500/30';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white m-0">
            Real-Time System Incident & Kernel Event Stream
          </h3>
          <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
            {incidents.length} events
          </span>
        </div>

        {/* Filter & Clear buttons */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === 'critical' ? 'bg-rose-900/60 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Critical / Crash
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === 'warning' ? 'bg-amber-900/60 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Warnings
            </button>
          </div>

          <button
            onClick={onClearIncidents}
            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 cursor-pointer"
            title="Clear Event Log"
          >
            <Delete size={14} />
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-6 text-slate-500 font-mono text-xs">
            No incidents logged yet. System telemetry is normal.
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                {incident.severity === 'critical' || incident.severity === 'fatal' ? (
                  <Bug size={16} className="text-rose-400" />
                ) : incident.severity === 'warning' ? (
                  <Shield size={16} className="text-amber-400" />
                ) : (
                  <Check size={16} className="text-blue-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{incident.timestamp}</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                    {incident.component}
                  </span>
                  <span className="text-white font-semibold text-xs truncate">{incident.title}</span>
                </div>
                <p className="text-slate-300 text-[11px] mt-1 leading-relaxed font-mono">
                  {incident.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
