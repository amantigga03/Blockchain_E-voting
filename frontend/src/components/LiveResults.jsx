import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Users,
  Vote,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Download,
  Award
} from 'lucide-react';
import { api, API_BASE } from '../api';

export default function LiveResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.getResults();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleExportCsv = () => {
  window.open(`${API_BASE}/results/export`, '_blank');
};

  if (loading && !data) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Loading live blockchain tally...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-rose-600">
        Unable to load results. Ensure backend is running on port 5000.
      </div>
    );
  }

  const leader = data.totalVotes > 0 ? data.results[0] : null;
  const maxVotes = Math.max(1, ...data.results.map((r) => r.votes));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* WINNER ANNOUNCEMENT BANNER WHEN ELECTION ENDED (5B) */}
      {data.electionStatus === 'ENDED' && data.winner && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-6 sm:p-8 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner">
                {data.winner.symbol}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Award className="w-3.5 h-3.5" /> Official Election Winner Announced
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">{data.winner.name}</h2>
                <p className="text-sm text-amber-100 font-medium">
                  {data.winner.party} • Won with {data.winner.votes} votes ({data.winner.percentage}%
                  vote share)
                </p>
              </div>
            </div>
            <Trophy className="w-14 h-14 text-amber-200 opacity-90 hidden sm:block" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>TOTAL VOTES CAST</span>
            <Vote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {data.totalVotes}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mined in SQLite ledger
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>VOTER TURNOUT</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {data.turnoutPercentage}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.totalVotes} of {data.totalRegistered} registered
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>{data.electionStatus === 'ENDED' ? 'WINNER' : 'CURRENT LEADER'}</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 truncate">
            {leader ? `${leader.symbol} ${leader.name}` : 'No Votes Yet'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {leader ? `${leader.votes} votes (${leader.percentage}%)` : 'Waiting for voters'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>CHAIN INTEGRITY</span>
            {data.chainValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div
            className={`text-xl font-extrabold mt-2 ${
              data.chainValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}
          >
            {data.chainValid ? '100% Verified' : 'Tamper Alert!'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SHA-256 live audit
          </div>
        </div>
      </div>

      {/* Visual Bar Chart Card (5A) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Live Vote Distribution Chart
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time analytics tallied directly from verified blockchain blocks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV Report
            </button>
            <button
              onClick={fetchResults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Vertical Bar Chart */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end h-52 pt-6 pb-3 px-2 border-b border-slate-100 dark:border-slate-800 mb-6">
          {data.results.map((cand) => {
            const heightPct = data.totalVotes > 0 ? Math.max(12, Math.round((cand.votes / maxVotes) * 100)) : 8;
            return (
              <div key={cand.id} className="flex flex-col items-center h-full justify-end">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                  {cand.votes} ({cand.percentage}%)
                </div>
                <div className="w-full max-w-[72px] bg-slate-100 dark:bg-slate-800 rounded-t-xl h-36 flex items-end overflow-hidden">
                  <div
                    className="w-full rounded-t-xl transition-all duration-700"
                    style={{ height: `${heightPct}%`, backgroundColor: cand.color }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-lg leading-none">{cand.symbol}</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[110px]">
                    {cand.name.split(' ')[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Standings List */}
        <div className="space-y-4">
          {data.results.map((cand, index) => (
            <div
              key={cand.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${cand.color}20` }}
                  >
                    {cand.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{cand.name}</span>
                      {index === 0 && cand.votes > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                          {data.electionStatus === 'ENDED' ? 'Winner' : 'Leading'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {cand.party}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {cand.votes} votes
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {cand.percentage}%
                  </div>
                </div>
              </div>

              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cand.percentage}%`, backgroundColor: cand.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
