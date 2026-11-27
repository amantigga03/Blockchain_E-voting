import React, { useEffect, useState } from 'react';
import {
  Vote,
  BarChart3,
  Blocks,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import VoterPortal from './components/VoterPortal';
import LiveResults from './components/LiveResults';
import BlockchainExplorer from './components/BlockchainExplorer';
import AdminPanel from './components/AdminPanel';
import { api } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('vote');
  const [status, setStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('blockvote_theme') === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('blockvote_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('blockvote_theme', 'light');
    }
  }, [darkMode]);

  const fetchStatus = async () => {
    try {
      const res = await api.getStatus();
      setStatus(res);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const navItems = [
    { id: 'vote', label: 'Cast Vote', icon: Vote },
    { id: 'results', label: 'Live Results', icon: BarChart3 },
    { id: 'explorer', label: 'Blockchain Explorer', icon: Blocks },
    { id: 'admin', label: 'Admin Panel', icon: Settings }
  ];

  const isChainValid = status?.chainIntegrity?.valid ?? true;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                BlockVote
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                SQLite + JWT Blockchain
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Dark/Light Mode Toggle (3A) */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              title="Toggle Dark / Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {status ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  isChainValid
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {isChainValid ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isChainValid ? 'Chain Verified' : 'Tampered'}
                </span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Backend Offline
              </span>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex border-t border-slate-100 dark:border-slate-800 overflow-x-auto px-2 py-1.5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Hero Strip */}
      <div
        className={`text-white no-print ${
          status?.electionTheme === 'CIVIC'
            ? 'bg-gradient-to-r from-orange-600 via-indigo-700 to-emerald-700'
            : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {status?.electionTitle || 'University Student Council Election 2026'}
            </h1>
            <p className="text-indigo-100 text-sm mt-1">
              {status?.electionSubtitle ||
                'Transparent, tamper-proof voting powered by SHA-256 Blockchain, SQLite & JWT.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold tracking-wide">
              THEME: {status?.electionTheme || 'COLLEGE'}
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold tracking-wide">
              STATUS: {status?.electionStatus || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'vote' && (
          <VoterPortal onVoteSuccess={fetchStatus} showToast={showToast} />
        )}
        {activeTab === 'results' && <LiveResults />}
        {activeTab === 'explorer' && (
          <BlockchainExplorer onChainChange={fetchStatus} showToast={showToast} />
        )}
        {activeTab === 'admin' && (
          <AdminPanel status={status} onDataChange={fetchStatus} showToast={showToast} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        BlockVote v3 — Blockchain E-Voting System • React + Tailwind CSS + Node.js + SQLite + JWT
      </footer>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all no-print ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-indigo-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
