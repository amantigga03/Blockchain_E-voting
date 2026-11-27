import React, { useEffect, useState } from 'react';
import {
  Blocks,
  ShieldCheck,
  ShieldAlert,
  Search,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle2,
  Hash
} from 'lucide-react';
import { api } from '../api';

export default function BlockchainExplorer({ onChainChange, showToast }) {
  const [chainData, setChainData] = useState(null);
  const [txQuery, setTxQuery] = useState('');
  const [receiptResult, setReceiptResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadChain = async () => {
    setLoading(true);
    try {
      const res = await api.getChain();
      setChainData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChain();
  }, []);

  const handleVerifyReceipt = async (e) => {
    e.preventDefault();
    if (!txQuery.trim()) return;
    try {
      const res = await api.verifyReceipt(txQuery.trim());
      setReceiptResult(res);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSimulateTamper = async () => {
    try {
      const res = await api.simulateTamper();
      showToast(res.message, 'error');
      await loadChain();
      if (onChainChange) onChainChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading && !chainData) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Loading blockchain ledger...
      </div>
    );
  }

  const isValid = chainData?.integrity?.valid;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Integrity Banner */}
      <div
        className={`rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4 ${
          isValid
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {isValid ? (
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-7 h-7 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          )}
          <div>
            <h3 className="font-bold text-base">
              {isValid ? 'Blockchain Integrity Verified' : 'SECURITY ALERT: Data Tampering Detected!'}
            </h3>
            <p className="text-sm opacity-90">{chainData?.integrity?.reason}</p>
          </div>
        </div>

        <button
          onClick={handleSimulateTamper}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 text-xs font-bold transition-all shadow-sm"
        >
          <AlertTriangle className="w-4 h-4" /> Simulate Hack / Tamper Attack
        </button>
      </div>

      {/* Receipt Verifier (4D) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Verify Your Vote Receipt
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Paste your Transaction ID (e.g., 0x...) to confirm your vote is permanently included on
          the blockchain.
        </p>

        <form onSubmit={handleVerifyReceipt} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Paste Transaction ID (0x...)"
            value={txQuery}
            onChange={(e) => setTxQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
          >
            Verify Receipt
          </button>
        </form>

        {receiptResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-sm ${
              receiptResult.found
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            {receiptResult.found ? (
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Vote Verified in Block #{receiptResult.blockIndex} (Nonce: {receiptResult.nonce})
                  </div>
                  <div className="text-xs mt-1 font-mono break-all">
                    Candidate: <strong>{receiptResult.transaction.candidateName}</strong> • Time:{' '}
                    {new Date(receiptResult.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div>No vote found matching that Transaction ID.</div>
            )}
          </div>
        )}
      </div>

      {/* Block List (4A) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Blocks className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Public SQLite
            Blockchain Ledger ({chainData?.length || 0} Blocks)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            PoW Difficulty: {chainData?.difficulty} leading zeros
          </span>
        </div>

        <div className="space-y-4">
          {chainData?.chain
            ?.slice()
            .reverse()
            .map((block) => {
              const isCorrupted = chainData.integrity?.corruptedBlockIndex === block.index;
              return (
                <div
                  key={block.index}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all ${
                    isCorrupted
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                          block.index === 0
                            ? 'bg-slate-800 text-white'
                            : isCorrupted
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        BLOCK #{block.index}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(block.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md">
                      Nonce: {block.nonce}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 my-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-slate-400 font-semibold flex items-center gap-1 mb-1">
                        <LinkIcon className="w-3.5 h-3.5" /> PREVIOUS HASH
                      </div>
                      <div className="font-mono text-slate-600 dark:text-slate-400 break-all">
                        {block.previousHash}
                      </div>
                    </div>
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      <div className="text-indigo-500 dark:text-indigo-400 font-semibold flex items-center gap-1 mb-1">
                        <Hash className="w-3.5 h-3.5" /> BLOCK HASH (SHA-256)
                      </div>
                      <div className="font-mono text-indigo-800 dark:text-indigo-300 font-semibold break-all">
                        {block.hash}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 text-slate-100 rounded-xl p-3.5 text-xs font-mono overflow-x-auto border border-slate-800">
                    {block.transactions.map((tx, idx) =>
                      tx.type === 'GENESIS' ? (
                        <div key={idx} className="text-emerald-400">
                          🌱 GENESIS: {tx.message}
                        </div>
                      ) : (
                        <div key={idx} className="space-y-1">
                          <div>
                            <span className="text-slate-400">TX ID:</span>{' '}
                            <span className="text-amber-300">{tx.txId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">VOTER HASH (ANONYMIZED):</span>{' '}
                            <span className="text-sky-300">{tx.voterHash.slice(0, 36)}...</span>
                          </div>
                          <div>
                            <span className="text-slate-400">CAST FOR:</span>{' '}
                            <span
                              className={`font-bold ${
                                isCorrupted ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {tx.candidateName}
                            </span>{' '}
                            ({tx.candidateId})
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
