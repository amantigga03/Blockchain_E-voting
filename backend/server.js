require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  DIFFICULTY,
  initDatabase,
  seedTheme,
  getConfig,
  queryAll,
  queryOne,
  runSql,
  sha256,
  hashVoterId,
  calculateAge,
  mineBlock,
  validateChain,
  hasVoterVotedOnChain
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'blockvote_super_secret_jwt_key_2026';
const ADMIN_PIN = process.env.ADMIN_PIN || 'admin123';

app.use(cors());
app.use(express.json());

// ---------- JWT MIDDLEWARE ----------
function authenticateToken(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Authentication token required.' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ ok: false, error: 'Insufficient permissions.' });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ ok: false, error: 'Session expired or invalid token. Please log in again.' });
    }
  };
}

// ---------- PUBLIC STATUS & DATA ----------
app.get('/api/status', (req, res) => {
  const config = getConfig();
  const blockCount = queryOne('SELECT COUNT(*) as cnt FROM blocks');
  const integrity = validateChain();
  res.json({
    electionTitle: config.title,
    electionSubtitle: config.subtitle,
    electionTheme: config.theme,
    electionStatus: config.status,
    totalBlocks: blockCount ? blockCount.cnt : 0,
    chainIntegrity: integrity
  });
});

app.get('/api/candidates', (req, res) => {
  const candidates = queryAll('SELECT * FROM candidates ORDER BY id ASC');
  res.json({ candidates });
});

app.get('/api/demo-voters', (req, res) => {
  const voters = queryAll('SELECT voter_id, name, dob, has_voted FROM voters ORDER BY created_at ASC');
  const list = voters.map((v) => ({
    voterId: v.voter_id,
    name: v.name,
    dob: v.dob,
    age: calculateAge(v.dob),
    hasVoted: Boolean(v.has_voted) || hasVoterVotedOnChain(v.voter_id)
  }));
  res.json({ voters: list });
});

// ---------- VOTER AUTH (REGISTER & JWT LOGIN) ----------
app.post('/api/auth/register', (req, res) => {
  try {
    const { voterId, name, dob, pin } = req.body;
    if (!voterId || !name || !dob || !pin) {
      return res.status(400).json({
        ok: false,
        error: 'Voter ID, Full Name, Date of Birth, and 4-digit PIN are required.'
      });
    }
    const normalizedId = String(voterId).trim().toUpperCase();
    if (normalizedId.length < 4) {
      return res.status(400).json({ ok: false, error: 'Voter ID must be at least 4 characters.' });
    }
    if (String(pin).trim().length < 4) {
      return res.status(400).json({ ok: false, error: 'PIN must be at least 4 digits.' });
    }

    const age = calculateAge(dob);
    if (age === null || age < 0) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid Date of Birth.' });
    }
    if (age < 18) {
      return res.status(400).json({
        ok: false,
        error: `Eligibility check failed: Voter must be at least 18 years old to register (Calculated age: ${age} years).`
      });
    }

    const existing = queryOne('SELECT voter_id FROM voters WHERE voter_id = ?', [normalizedId]);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'This Voter ID is already registered.' });
    }

    const pinHash = bcrypt.hashSync(String(pin).trim(), 8);
    runSql(
      'INSERT INTO voters (voter_id, name, dob, pin_hash, has_voted, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [normalizedId, String(name).trim(), String(dob).trim(), pinHash, new Date().toISOString()]
    );

    const token = jwt.sign(
      { role: 'voter', voterId: normalizedId, name: String(name).trim() },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(201).json({
      ok: true,
      message: 'Voter verified (18+) and registered successfully!',
      token,
      voter: {
        voterId: normalizedId,
        name: String(name).trim(),
        dob: String(dob).trim(),
        age,
        hasVoted: false
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { voterId, pin } = req.body;
    if (!voterId || !pin) {
      return res.status(400).json({ ok: false, error: 'Please enter both Voter ID and PIN.' });
    }
    const normalizedId = String(voterId).trim().toUpperCase();
    const voter = queryOne('SELECT * FROM voters WHERE voter_id = ?', [normalizedId]);
    if (!voter) {
      return res.status(401).json({ ok: false, error: 'Voter ID not found in electoral roll.' });
    }

    const pinOk = bcrypt.compareSync(String(pin).trim(), voter.pin_hash);
    if (!pinOk) {
      return res.status(401).json({ ok: false, error: 'Invalid Security PIN.' });
    }

    const alreadyVoted = Boolean(voter.has_voted) || hasVoterVotedOnChain(normalizedId);
    if (alreadyVoted) {
      return res.status(403).json({
        ok: false,
        error: 'Double-voting blocked: This Voter ID has already cast a vote on the blockchain.'
      });
    }

    const token = jwt.sign(
      { role: 'voter', voterId: voter.voter_id, name: voter.name },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      ok: true,
      token,
      voter: { voterId: voter.voter_id, name: voter.name, hasVoted: false }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- CAST VOTE (JWT PROTECTED) ----------
app.post('/api/vote', authenticateToken('voter'), (req, res) => {
  try {
    const config = getConfig();
    if (config.status !== 'ACTIVE') {
      return res.status(400).json({
        ok: false,
        error: `Voting is currently ${config.status.toLowerCase()}.`
      });
    }

    const { candidateId } = req.body;
    const { voterId } = req.user;

    const voter = queryOne('SELECT * FROM voters WHERE voter_id = ?', [voterId]);
    if (!voter) {
      return res.status(404).json({ ok: false, error: 'Voter record not found.' });
    }
    if (voter.has_voted || hasVoterVotedOnChain(voterId)) {
      return res.status(403).json({
        ok: false,
        error: 'Double-voting blocked: Your vote is already recorded on the blockchain.'
      });
    }

    const candidate = queryOne('SELECT * FROM candidates WHERE id = ?', [candidateId]);
    if (!candidate) {
      return res.status(400).json({ ok: false, error: 'Selected candidate does not exist.' });
    }

    const latestBlock = queryOne('SELECT * FROM blocks ORDER BY block_index DESC LIMIT 1');
    const voterHash = hashVoterId(voterId);
    const timestamp = new Date().toISOString();
    const txId = `0x${sha256(`${voterHash}|${candidate.id}|${timestamp}|${Math.random()}`).substring(0, 24)}`;

    const voteTx = {
      type: 'VOTE',
      txId,
      voterHash, // Anonymized SHA-256 voter hash
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateParty: candidate.party,
      timestamp
    };

    const newBlock = mineBlock(latestBlock.block_index + 1, latestBlock.hash, timestamp, [voteTx]);

    runSql(
      'INSERT INTO blocks (block_index, timestamp, transactions_json, previous_hash, nonce, hash) VALUES (?, ?, ?, ?, ?, ?)',
      [
        newBlock.block_index,
        newBlock.timestamp,
        newBlock.transactions_json,
        newBlock.previous_hash,
        newBlock.nonce,
        newBlock.hash
      ]
    );
    runSql('UPDATE voters SET has_voted = 1 WHERE voter_id = ?', [voterId]);

    res.status(201).json({
      ok: true,
      message: 'Your vote has been mined and locked onto the blockchain!',
      receipt: {
        txId,
        voterHash,
        blockIndex: newBlock.block_index,
        blockHash: newBlock.hash,
        previousHash: newBlock.previous_hash,
        nonce: newBlock.nonce,
        timestamp: newBlock.timestamp,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          symbol: candidate.symbol
        }
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- LIVE RESULTS & CSV EXPORT ----------
function computeResults() {
  const config = getConfig();
  const candidates = queryAll('SELECT * FROM candidates ORDER BY id ASC');
  const voterCountRow = queryOne('SELECT COUNT(*) as cnt FROM voters');
  const totalRegistered = voterCountRow ? voterCountRow.cnt : 0;

  const counts = {};
  candidates.forEach((c) => {
    counts[c.id] = 0;
  });

  let totalVotes = 0;
  const blocks = queryAll('SELECT transactions_json FROM blocks WHERE block_index > 0 ORDER BY block_index ASC');
  for (const b of blocks) {
    try {
      const txs = JSON.parse(b.transactions_json);
      for (const tx of txs) {
        if (tx.type === 'VOTE' && counts[tx.candidateId] !== undefined) {
          counts[tx.candidateId]++;
          totalVotes++;
        }
      }
    } catch {
      // ignore
    }
  }

  const results = candidates
    .map((c) => ({
      ...c,
      votes: counts[c.id] || 0,
      percentage: totalVotes > 0 ? Number(((counts[c.id] / totalVotes) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.votes - a.votes);

  const integrity = validateChain();
  const winner =
    config.status === 'ENDED' && totalVotes > 0
      ? results[0]
      : null;

  return {
    electionTitle: config.title,
    electionTheme: config.theme,
    electionStatus: config.status,
    totalRegistered,
    totalVotes,
    turnoutPercentage:
      totalRegistered > 0 ? Number(((totalVotes / totalRegistered) * 100).toFixed(1)) : 0,
    chainValid: integrity.valid,
    winner,
    results
  };
}

app.get('/api/results', (req, res) => {
  res.json(computeResults());
});

app.get('/api/results/export', (req, res) => {
  const data = computeResults();
  const lines = [
    ['Rank', 'Candidate ID', 'Candidate Name', 'Party', 'Votes', 'Vote Share (%)'].join(',')
  ];
  data.results.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        `"${r.id}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.party.replace(/"/g, '""')}"`,
        r.votes,
        `${r.percentage}%`
      ].join(',')
    );
  });
  lines.push('');
  lines.push(`"Election Title","${data.electionTitle}"`);
  lines.push(`"Status","${data.electionStatus}"`);
  lines.push(`"Total Registered Voters",${data.totalRegistered}`);
  lines.push(`"Total Votes Cast",${data.totalVotes}`);
  lines.push(`"Turnout","${data.turnoutPercentage}%"`);
  lines.push(`"Blockchain Integrity","${data.chainValid ? 'VERIFIED' : 'TAMPERED'}"`);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="blockvote-election-results.csv"');
  res.send(lines.join('\n'));
});

// ---------- BLOCKCHAIN EXPLORER, RECEIPT VERIFIER & TAMPER DEMO ----------
app.get('/api/chain', (req, res) => {
  const rows = queryAll('SELECT * FROM blocks ORDER BY block_index ASC');
  const chain = rows.map((b) => ({
    index: b.block_index,
    timestamp: b.timestamp,
    transactions: JSON.parse(b.transactions_json),
    previousHash: b.previous_hash,
    nonce: b.nonce,
    hash: b.hash
  }));
  res.json({
    length: chain.length,
    difficulty: DIFFICULTY,
    integrity: validateChain(),
    chain
  });
});

app.get('/api/receipt/:txId', (req, res) => {
  const query = String(req.params.txId || '').trim().toLowerCase();
  const rows = queryAll('SELECT * FROM blocks ORDER BY block_index ASC');
  for (const b of rows) {
    const txs = JSON.parse(b.transactions_json);
    for (const tx of txs) {
      if (tx.txId && tx.txId.toLowerCase() === query) {
        return res.json({
          found: true,
          blockIndex: b.block_index,
          blockHash: b.hash,
          nonce: b.nonce,
          timestamp: b.timestamp,
          chainValid: validateChain().valid,
          transaction: tx
        });
      }
    }
  }
  res.json({ found: false });
});

app.post('/api/chain/tamper', (req, res) => {
  const latest = queryOne('SELECT * FROM blocks WHERE block_index > 0 ORDER BY block_index DESC LIMIT 1');
  if (!latest) {
    return res.status(400).json({
      ok: false,
      error: 'Cast at least 1 vote before simulating a hack/tamper attack.'
    });
  }
  const txs = JSON.parse(latest.transactions_json);
  if (txs[0] && txs[0].type === 'VOTE') {
    txs[0].candidateName = 'HACKED_CANDIDATE (TAMPERED)';
    runSql('UPDATE blocks SET transactions_json = ? WHERE block_index = ?', [
      JSON.stringify(txs),
      latest.block_index
    ]);
    return res.json({
      ok: true,
      message: `Simulated tamper attack on Block #${latest.block_index}! SHA-256 verification immediately detected the corruption.`,
      integrity: validateChain()
    });
  }
  res.status(400).json({ ok: false, error: 'No vote block found to tamper.' });
});

// ---------- ADMIN AUTH & CONTROLS (JWT PROTECTED) ----------
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (String(pin) === ADMIN_PIN) {
    const token = jwt.sign({ role: 'admin', username: 'ElectionAdmin' }, JWT_SECRET, {
      expiresIn: '4h'
    });
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: 'Invalid Admin PIN.' });
});

app.post('/api/admin/candidates', authenticateToken('admin'), (req, res) => {
  try {
    const { name, party, symbol, manifesto, color } = req.body;
    if (!name || !party) {
      return res.status(400).json({ ok: false, error: 'Candidate name and party are required.' });
    }
    const existing = queryAll('SELECT id FROM candidates');
    const nextNum = existing.length + 1;
    const id = `CAND-${String(nextNum).padStart(2, '0')}-${Date.now().toString().slice(-3)}`;
    runSql(
      'INSERT INTO candidates (id, name, party, symbol, color, manifesto) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        name.trim(),
        party.trim(),
        symbol || '🗳️',
        color || '#6366F1',
        manifesto || 'Committed to transparent and accountable leadership.'
      ]
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/admin/candidates/:id', authenticateToken('admin'), (req, res) => {
  runSql('DELETE FROM candidates WHERE id = ?', [req.params.id]);
  res.json({ ok: true, message: 'Candidate removed.' });
});

app.post('/api/admin/voters', authenticateToken('admin'), (req, res) => {
  try {
    const { voterId, name, dob, pin } = req.body;
    if (!voterId || !name || !dob || !pin) {
      return res.status(400).json({
        ok: false,
        error: 'Voter ID, Full Name, Date of Birth, and PIN are required.'
      });
    }
    const age = calculateAge(dob);
    if (age === null || age < 0) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid Date of Birth.' });
    }
    if (age < 18) {
      return res.status(400).json({
        ok: false,
        error: `Eligibility check failed: Voter must be 18+ years old (Calculated age: ${age} years).`
      });
    }
    const normalizedId = String(voterId).trim().toUpperCase();
    const existing = queryOne('SELECT voter_id FROM voters WHERE voter_id = ?', [normalizedId]);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Voter ID already exists.' });
    }
    const pinHash = bcrypt.hashSync(String(pin).trim(), 8);
    runSql(
      'INSERT INTO voters (voter_id, name, dob, pin_hash, has_voted, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [normalizedId, name.trim(), String(dob).trim(), pinHash, new Date().toISOString()]
    );
    res.status(201).json({ ok: true, voterId: normalizedId, age });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/status', authenticateToken('admin'), (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'PAUSED', 'ENDED'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status.' });
  }
  runSql('INSERT OR REPLACE INTO election_config (key, value) VALUES (?, ?)', ['status', status]);
  res.json({ ok: true, electionStatus: status });
});

app.post('/api/admin/theme', authenticateToken('admin'), (req, res) => {
  const { theme } = req.body;
  if (!['COLLEGE', 'CIVIC'].includes(theme)) {
    return res.status(400).json({ ok: false, error: 'Theme must be COLLEGE or CIVIC.' });
  }
  seedTheme(theme);
  res.json({ ok: true, message: `Switched to ${theme} Election theme with fresh Genesis block!` });
});

app.post('/api/admin/reset', authenticateToken('admin'), (req, res) => {
  const current = getConfig();
  seedTheme(current.theme);
  res.json({ ok: true, message: 'Blockchain & SQLite database reset to clean Genesis state.' });
});

// ---------- BOOT ----------
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 BlockVote v3 Backend running at http://localhost:${PORT}`);
      console.log(`🗄️  SQLite Database: backend/evoting.sqlite`);
      console.log(`🔐 JWT Auth enabled | Admin PIN: ${ADMIN_PIN}\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize SQLite database:', err);
    process.exit(1);
  });
