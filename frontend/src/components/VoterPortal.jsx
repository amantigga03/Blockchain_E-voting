import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  UserPlus,
  AlertCircle,
  Loader2,
  Lock,
  Printer,
  Download,
  Cpu,
  LogOut,
  Calendar
} from 'lucide-react';
import { api } from '../api';

function randomHex(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function getAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const parts = dobStr.split('-').map(Number);
  if (parts.length !== 3) return null;
  const dob = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  if (dob > today) return -1;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function VoterPortal({ onVoteSuccess, showToast }) {
  const [step, setStep] = useState(1); // 1: Auth, 2: Ballot, 3: Receipt
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [voterId, setVoterId] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [pin, setPin] = useState('');

  const [voterToken, setVoterToken] = useState('');
  const [verifiedVoter, setVerifiedVoter] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [demoVoters, setDemoVoters] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Proof-of-Work Mining Animation state
  const [mining, setMining] = useState(false);
  const [miningStats, setMiningStats] = useState({ nonce: 0, hash: '0000...' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      const [candRes, demoRes] = await Promise.all([api.getCandidates(), api.getDemoVoters()]);
      setCandidates(candRes.candidates || []);
      setDemoVoters(demoRes.voters || []);
    } catch {
      setError('Cannot connect to backend server. Start backend on port 5000.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (authMode === 'login') {
        res = await api.voterLogin(voterId, pin);
      } else {
        const calcAge = getAgeFromDob(dob);
        if (calcAge === null || calcAge < 0) {
          throw new Error('Please enter a valid Date of Birth.');
        }
        if (calcAge < 18) {
          throw new Error(
            `Eligibility check failed: You must be at least 18 years old to register and vote (Your age: ${calcAge} years).`
          );
        }
        res = await api.voterRegister(voterId, fullName, dob, pin);
      }
      setVoterToken(res.token);
      setVerifiedVoter(res.voter);
      setStep(2);
      showToast(
        authMode === 'login'
          ? `JWT Authenticated! Welcome ${res.voter.name}.`
          : `Registered & Authenticated! Welcome ${res.voter.name}.`,
        'success'
      );
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCastVote = async () => {
    if (!selectedCandidate || !voterToken) return;
    setError('');
    setConfirmOpen(false);
    setMining(true);

    // Run smooth Proof-of-Work mining animation alongside real API call
    let nonceCounter = 100;
    const interval = setInterval(() => {
      nonceCounter += Math.floor(Math.random() * 47) + 13;
      setMiningStats({
        nonce: nonceCounter,
        hash: randomHex(64)
      });
    }, 65);

    try {
      const [res] = await Promise.all([
        api.castVote(voterToken, selectedCandidate.id),
        new Promise((resolve) => setTimeout(resolve, 1400))
      ]);
      clearInterval(interval);
      setMiningStats({ nonce: res.receipt.nonce, hash: res.receipt.blockHash });
      setTimeout(() => {
        setMining(false);
        setReceipt(res.receipt);
        setStep(3);
        showToast('Block mined & vote permanently recorded on SQLite Blockchain!', 'success');
        if (onVoteSuccess) onVoteSuccess();
        loadData();
      }, 350);
    } catch (err) {
      clearInterval(interval);
      setMining(false);
      setError(err.message);
    }
  };

  const handleCopyTx = () => {
    if (!receipt?.txId) return;
    navigator.clipboard.writeText(receipt.txId);
    setCopied(true);
    showToast('Transaction ID copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    const content = [
      '======================================================',
      '        BLOCKVOTE — OFFICIAL CRYPTOGRAPHIC RECEIPT    ',
      '======================================================',
      `Transaction ID   : ${receipt.txId}`,
      `Block Number     : #${receipt.blockIndex}`,
      `PoW Nonce        : ${receipt.nonce}`,
      `Timestamp        : ${new Date(receipt.timestamp).toLocaleString()}`,
      `Candidate Voted  : ${receipt.candidate.name} (${receipt.candidate.party})`,
      `Anonymized Voter : ${receipt.voterHash}`,
      `Block SHA-256    : ${receipt.blockHash}`,
      `Previous Hash    : ${receipt.previousHash}`,
      '======================================================',
      'Verify this Transaction ID anytime in Blockchain Explorer.'
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlockVote-Receipt-${receipt.txId.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vote receipt downloaded!', 'success');
  };

  const resetFlow = () => {
    setStep(1);
    setVoterId('');
    setFullName('');
    setDob('');
    setPin('');
    setVoterToken('');
    setVerifiedVoter(null);
    setSelectedCandidate(null);
    setReceipt(null);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Progress Indicator */}
      <div className="mb-8 no-print">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {[
            { num: 1, label: 'JWT Verify / Register' },
            { num: 2, label: 'Digital Ballot' },
            { num: 3, label: 'Vote Receipt' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step > s.num
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                      : step === s.num
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-md'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={`text-xs mt-2 font-semibold ${
                    step >= s.num
                      ? 'text-slate-800 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-1 mx-3 rounded-full -mt-5 transition-all ${
                    step > s.num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3 no-print">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* STEP 1: VOTER LOGIN OR NEW REGISTRATION */}
      {step === 1 && (
        <div className="grid md:grid-cols-5 gap-6 items-start">
          <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            {/* Login / Register Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Existing Voter Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <UserPlus className="w-4 h-4" /> New Voter Register
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {authMode === 'login' ? 'Voter JWT Authentication' : 'Live Voter Registration'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {authMode === 'login'
                  ? 'Sign in with your Voter ID & PIN. Your identity is SHA-256 anonymized on-chain.'
                  : 'Register a brand new voter directly into SQLite and proceed to vote immediately.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Voter ID / Roll Number
                </label>
                <input
                  type="text"
                  required
                  placeholder={authMode === 'login' ? 'e.g., STU-1001' : 'e.g., STU-2026'}
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium uppercase"
                />
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Date of Birth (18+ Eligibility Check)
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                    {dob && (() => {
                      const liveAge = getAgeFromDob(dob);
                      if (liveAge === null || liveAge < 0) {
                        return (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
                            Please select a valid past date.
                          </p>
                        );
                      }
                      return liveAge >= 18 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5">
                          ✓ Eligible to vote (Age: {liveAge} years)
                        </p>
                      ) : (
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
                          ✗ Ineligible: Must be 18+ years old to register (Current age: {liveAge} years)
                        </p>
                      );
                    })()}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  4-Digit Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder={authMode === 'login' ? 'Enter PIN (Demo: 1234)' : 'Create 4-digit PIN'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 ${
                  authMode === 'login'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
                  </>
                ) : authMode === 'login' ? (
                  <>
                    Sign In &amp; Open Ballot <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Register &amp; Proceed to Ballot <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Protected by JWT Session Token, bcrypt PIN hashing &amp; SHA-256 Privacy Hash.</span>
            </div>
          </div>

          {/* Quick Demo Voters Helper */}
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-900 dark:to-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" /> Quick Demo Voters (PIN: 1234)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Click any eligible voter below to auto-fill credentials for instant demo testing:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {demoVoters.map((v) => (
                <button
                  key={v.voterId}
                  type="button"
                  disabled={v.hasVoted}
                  onClick={() => {
                    setAuthMode('login');
                    setVoterId(v.voterId);
                    setPin('1234');
                    setError('');
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    v.hasVoted
                      ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-slate-700 hover:border-indigo-400 text-slate-800 dark:text-slate-100 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="font-bold font-mono">{v.voterId}</div>
                    <div className="text-slate-500 dark:text-slate-400">{v.name}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      v.hasVoted
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                    }`}
                  >
                    {v.hasVoted ? 'Voted' : 'Eligible'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DIGITAL BALLOT */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> JWT Verified: {verifiedVoter?.name} (
                {verifiedVoter?.voterId})
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Official Digital Ballot
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select your preferred candidate card below and click &ldquo;Submit My Vote&rdquo;.
              </p>
            </div>
            <button
              onClick={resetFlow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 my-6">
            {candidates.map((cand) => {
              const isSelected = selectedCandidate?.id === cand.id;
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => setSelectedCandidate(cand)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ backgroundColor: `${cand.color}20` }}
                    >
                      {cand.symbol}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                        {cand.name}
                      </h3>
                      <p className="text-xs font-semibold" style={{ color: cand.color }}>
                        {cand.party}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cand.manifesto}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              disabled={!selectedCandidate}
              onClick={() => setConfirmOpen(true)}
              className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 disabled:shadow-none"
            >
              Submit My Vote <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Your Vote</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Once mined into a SHA-256 block, your vote is immutable and cannot be altered.
            </p>

            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
              <div className="text-3xl">{selectedCandidate.symbol}</div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Selected Candidate
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-lg">
                  {selectedCandidate.name}
                </div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {selectedCandidate.party}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCastVote}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-500/20"
              >
                Confirm &amp; Mine Vote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF-OF-WORK MINING ANIMATION OVERLAY (4B) */}
      {mining && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full p-7 shadow-2xl border border-indigo-500/40 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center mb-4 animate-pulse">
              <Cpu className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">Mining Proof-of-Work Block...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Solving SHA-256 cryptographic puzzle &amp; anonymizing Voter ID
            </p>

            <div className="mt-5 bg-slate-950 rounded-xl p-4 border border-slate-800 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">NONCE ATTEMPTS:</span>
                <span className="text-emerald-400 font-bold">#{miningStats.nonce}</span>
              </div>
              <div>
                <div className="text-slate-400 mb-1">COMPUTING SHA-256 HASH:</div>
                <div className="text-indigo-300 break-all leading-relaxed">{miningStats.hash}</div>
              </div>
            </div>

            <div className="mt-4 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 w-3/4 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CRYPTOGRAPHIC VOTE RECEIPT (PRINT & DOWNLOAD) */}
      {step === 3 && receipt && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Vote Successfully Mined on Blockchain!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Download or print your cryptographic receipt below. Verify your Transaction ID anytime
            in the Blockchain Explorer.
          </p>

          <div className="mt-6 max-w-xl mx-auto bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Transaction ID (Receipt)
              </span>
              <button
                onClick={handleCopyTx}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline no-print"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-sm bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 font-bold break-all">
              {receipt.txId}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 font-medium">Block #</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  #{receipt.blockIndex}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 font-medium">PoW Nonce</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {receipt.nonce}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 font-medium">Candidate</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {receipt.candidate.symbol} {receipt.candidate.name}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-slate-400 font-medium">Anonymized Voter SHA-256 Hash</div>
              <div className="font-mono text-emerald-700 dark:text-emerald-400 break-all mt-0.5">
                {receipt.voterHash}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-slate-400 font-medium">Mined Block SHA-256 Hash</div>
              <div className="font-mono text-slate-700 dark:text-slate-300 break-all mt-0.5">
                {receipt.blockHash}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 no-print">
            <button
              onClick={handleDownloadReceipt}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" /> Download Receipt (.txt)
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm inline-flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
            <button
              onClick={resetFlow}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-sm"
            >
              Vote as Another User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
