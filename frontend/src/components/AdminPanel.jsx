import React, { useEffect, useState } from 'react';
import {
  Lock,
  UserPlus,
  PlusCircle,
  RotateCcw,
  Power,
  Shield,
  Trash2,
  GraduationCap,
  Landmark,
  LogOut
} from 'lucide-react';
import { api } from '../api';

export default function AdminPanel({ status, onDataChange, showToast }) {
  const [pin, setPin] = useState('');
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminJwt') || '');
  const [candidates, setCandidates] = useState([]);
  const [candForm, setCandForm] = useState({
    name: '',
    party: '',
    symbol: '🌟',
    manifesto: '',
    color: '#4F46E5'
  });
  const [voterForm, setVoterForm] = useState({ voterId: '', name: '', dob: '2003-01-01', pin: '1234' });

  const loadCandidates = async () => {
    try {
      const res = await api.getCandidates();
      setCandidates(res.candidates || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (adminToken) loadCandidates();
  }, [adminToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.adminLogin(pin);
      sessionStorage.setItem('adminJwt', res.token);
      setAdminToken(res.token);
      setPin('');
      showToast('Admin JWT authenticated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminJwt');
    setAdminToken('');
    showToast('Admin logged out.', 'success');
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await api.addCandidate(adminToken, candForm);
      setCandForm({ name: '', party: '', symbol: '🌟', manifesto: '', color: '#4F46E5' });
      showToast('Candidate added to SQLite ballot!', 'success');
      loadCandidates();
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveCandidate = async (id) => {
    if (!window.confirm('Remove this candidate from the ballot?')) return;
    try {
      await api.deleteCandidate(adminToken, id);
      showToast('Candidate removed.', 'success');
      loadCandidates();
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();
    try {
      await api.registerVoterAdmin(adminToken, voterForm);
      setVoterForm({ voterId: '', name: '', dob: '2003-01-01', pin: '1234' });
      showToast('Voter registered in SQLite!', 'success');
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateStatus(adminToken, newStatus);
      showToast(`Election status set to ${newStatus}`, 'success');
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSwitchTheme = async (theme) => {
    if (
      !window.confirm(
        `Switch to ${theme === 'COLLEGE' ? 'College Student Council' : 'Indian General Civic'} Election? This resets the chain with pre-loaded demo candidates & voters.`
      )
    )
      return;
    try {
      const res = await api.switchTheme(adminToken, theme);
      showToast(res.message, 'success');
      loadCandidates();
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset the SQLite database & blockchain back to Genesis state?')) return;
    try {
      const res = await api.resetElection(adminToken);
      showToast(res.message, 'success');
      loadCandidates();
      if (onDataChange) onDataChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Election Commission Admin
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          JWT-protected Admin Dashboard. Default PIN:{' '}
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">admin123</span>
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Enter Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-semibold"
          >
            Unlock Admin Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Election Controls & Theme Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">
                Election Commission Controls
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End election to reveal the Winner Banner, or reset after a tamper demo.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" /> Admin Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" /> Start / Active
          </button>
          <button
            onClick={() => handleStatusChange('PAUSED')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
          >
            Pause Voting
          </button>
          <button
            onClick={() => handleStatusChange('ENDED')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            End Election &amp; Announce Winner
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 1-Click Reset Chain
          </button>
        </div>

        {/* Election Theme Switcher (6A & 6B) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Switch Election Theme (Pre-loaded Demo Data)
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleSwitchTheme('COLLEGE')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                status?.electionTheme === 'COLLEGE'
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
              }`}
            >
              <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  College Student Council
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Campus panels &amp; STU-1001..1005 voters
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSwitchTheme('CIVIC')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                status?.electionTheme === 'CIVIC'
                  ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-orange-400'
              }`}
            >
              <Landmark className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Indian General Civic Election
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Indian parties &amp; IND-1001..1005 voters
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Add Candidate & Add Voter */}
      <div className="grid md:grid-cols-2 gap-6">
        <form
          onSubmit={handleAddCandidate}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Add New Candidate
          </h3>
          <input
            type="text"
            required
            placeholder="Candidate Full Name"
            value={candForm.name}
            onChange={(e) => setCandForm({ ...candForm, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Party / Panel"
              value={candForm.party}
              onChange={(e) => setCandForm({ ...candForm, party: e.target.value })}
              className="col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Emoji"
              value={candForm.symbol}
              onChange={(e) => setCandForm({ ...candForm, symbol: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Short manifesto / agenda..."
            value={candForm.manifesto}
            onChange={(e) => setCandForm({ ...candForm, manifesto: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
          >
            Add Candidate to Ballot
          </button>
        </form>

        <form
          onSubmit={handleAddVoter}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Register New
            Voter
          </h3>
          <input
            type="text"
            required
            placeholder="Voter ID (e.g., STU-1006)"
            value={voterForm.voterId}
            onChange={(e) => setVoterForm({ ...voterForm, voterId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm uppercase font-mono outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            required
            placeholder="Voter Full Name"
            value={voterForm.name}
            onChange={(e) => setVoterForm({ ...voterForm, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Date of Birth (Must be 18+)
            </label>
            <input
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={voterForm.dob}
              onChange={(e) => setVoterForm({ ...voterForm, dob: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="text"
            required
            placeholder="4-Digit Security PIN"
            value={voterForm.pin}
            onChange={(e) => setVoterForm({ ...voterForm, pin: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
          >
            Register Eligible Voter
          </button>
        </form>
      </div>

      {/* Manage Existing Candidates (Remove) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">
          Current Ballot Candidates ({candidates.length})
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.symbol}</span>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{c.party}</div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveCandidate(c.id)}
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                title="Remove Candidate"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
