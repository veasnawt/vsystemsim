import React from 'react';
import {
  Idea,
  Check,
  Shield,
  TrendUp,
  Database,
  Factory,
  Search,
  Settings,
} from '@veasnawt/vicons';
import type { ArchitectureRecommendation } from '../types/simulation';

interface RecommendationsPanelProps {
  recommendations: ArchitectureRecommendation[];
  onApplyRecommendation: (actionKey: string) => void;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  onApplyRecommendation,
}) => {
  const getPriorityBadge = (priority: ArchitectureRecommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'low':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getCategoryIcon = (category: ArchitectureRecommendation['category']) => {
    switch (category) {
      case 'reliability':
        return <Shield size={16} className="text-rose-400" />;
      case 'performance':
        return <TrendUp size={16} className="text-emerald-400" />;
      case 'scalability':
        return <Factory size={16} className="text-indigo-400" />;
      case 'cost':
        return <Database size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-xl flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
          <Idea size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight m-0">
            Intelligent System Architecture Advisor
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Based on active simulated workloads, failure modes, memory ceilings, and traffic bottlenecks,
            here are production-grade engineering recommendations on <strong>what to do</strong>, <strong>what technologies to use</strong>,
            and their trade-offs. You can click <strong>Apply Architectural Fix</strong> to test remedies instantly.
          </p>
        </div>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3">
            <Check size={24} />
          </div>
          <h4 className="text-sm font-bold text-white m-0">
            System Architecture is Optimal!
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No critical bottlenecks, memory leaks, or connection pool saturations detected for the current workload.
            Try triggering a traffic spike or enabling heavy video rendering to see how the architecture responds!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-xl transition-all flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getCategoryIcon(rec.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded border ${getPriorityBadge(
                          rec.priority
                        )}`}
                      >
                        {rec.priority} Priority
                      </span>
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        {rec.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1 m-0">
                      {rec.title}
                    </h4>
                  </div>
                </div>

                {/* Apply Fix Button */}
                {rec.actionKey && (
                  <button
                    onClick={() => onApplyRecommendation(rec.actionKey!)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
                  >
                    <Check size={15} />
                    <span>Apply Architectural Fix</span>
                  </button>
                )}
              </div>

              {/* Problem Analysis */}
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3 text-xs">
                <span className="font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                  <Search size={13} className="text-rose-400 shrink-0" />
                  <span>Root Cause / Bottleneck:</span>
                </span>
                <p className="text-slate-300 leading-relaxed m-0">
                  {rec.problem}
                </p>
              </div>

              {/* Solution & What To Use */}
              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 text-xs">
                <span className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Settings size={13} className="text-emerald-400 shrink-0" />
                  <span>Recommended Architecture & What To Use:</span>
                </span>
                <p className="text-slate-300 leading-relaxed m-0">
                  {rec.solution}
                </p>
              </div>

              {/* Trade-offs & Cost Delta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1 text-slate-400">
                <div>
                  <strong className="text-slate-300">Engineering Trade-offs: </strong>
                  <span>{rec.tradeoffs}</span>
                </div>
                <div className="shrink-0 font-medium">
                  Cost Delta:{' '}
                  <span
                    className={
                      rec.estimatedCostDeltaMonthly > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }
                  >
                    {rec.estimatedCostDeltaMonthly > 0 ? '+' : ''}${rec.estimatedCostDeltaMonthly}/mo
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
