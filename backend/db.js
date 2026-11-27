const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'evoting.sqlite');
const VOTER_SALT = process.env.VOTER_SALT || 'BLOCKVOTE_INDIA_2026_SHA256_SALT';
const DIFFICULTY = 2;

let db = null;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hashVoterId(voterId) {
  return sha256(`${String(voterId).trim().toUpperCase()}:${VOTER_SALT}`);
}

function calculateAge(dobString) {
  if (!dobString || !/^\d{4}-\d{2}-\d{2}$/.test(String(dobString).trim())) {
    return null;
  }
  const [year, month, day] = String(dobString).trim().split('-').map(Number);
  const dob = new Date(year, month - 1, day);
  if (
    Number.isNaN(dob.getTime()) ||
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  if (dob > today) return -1;
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateBlockHash(blockIndex, previousHash, timestamp, transactionsJson, nonce) {
  return sha256(`${blockIndex}|${previousHash}|${timestamp}|${transactionsJson}|${nonce}`);
}

function mineBlock(blockIndex, previousHash, timestamp, transactions) {
  const transactionsJson = JSON.stringify(transactions);
  let nonce = 0;
  let hash = calculateBlockHash(blockIndex, previousHash, timestamp, transactionsJson, nonce);
  const target = '0'.repeat(DIFFICULTY);
  while (hash.substring(0, DIFFICULTY) !== target) {
    nonce++;
    hash = calculateBlockHash(blockIndex, previousHash, timestamp, transactionsJson, nonce);
  }
  return {
    block_index: blockIndex,
    timestamp,
    transactions_json: transactionsJson,
    previous_hash: previousHash,
    nonce,
    hash
  };
}

const THEMES = {
  COLLEGE: {
    title: 'University Student Council Election 2026',
    subtitle: 'Campus-wide Blockchain E-Voting Portal',
    candidates: [
      {
        id: 'CAND-01',
        name: 'Aarav Sharma',
        party: 'Tech & Innovation Panel',
        symbol: '🚀',
        color: '#4F46E5',
        manifesto: '24/7 AI & coding labs, faster campus Wi-Fi, annual hackathon funding, and transparent student budgets.'
      },
      {
        id: 'CAND-02',
        name: 'Priya Verma',
        party: 'Academic Excellence Front',
        symbol: '📚',
        color: '#059669',
        manifesto: 'Extended library hours, industry mentorship workshops, placement prep bootcamps, and digital notes portal.'
      },
      {
        id: 'CAND-03',
        name: 'Rohan Das',
        party: 'Campus Unity Alliance',
        symbol: '🏆',
        color: '#D97706',
        manifesto: 'Upgraded sports complex, better hostel facilities, cultural fest grants, and student grievance helpline.'
      },
      {
        id: 'CAND-04',
        name: 'Ananya Nair',
        party: 'Green Campus Initiative',
        symbol: '🌱',
        color: '#E11D48',
        manifesto: 'Solar-powered classrooms, plastic-free cafeteria, EV campus shuttles, and mental wellness support.'
      }
    ],
    voters: [
      { voter_id: 'STU-1001', name: 'Rahul Kumar', dob: '2003-04-15', pin: '1234' },
      { voter_id: 'STU-1002', name: 'Sneha Gupta', dob: '2004-08-22', pin: '1234' },
      { voter_id: 'STU-1003', name: 'Vikram Singh', dob: '2002-11-09', pin: '1234' },
      { voter_id: 'STU-1004', name: 'Meera Patel', dob: '2003-01-30', pin: '1234' },
      { voter_id: 'STU-1005', name: 'Arjun Reddy', dob: '2004-05-18', pin: '1234' }
    ]
  },
  CIVIC: {
    title: 'Indian General Civic E-Election 2026',
    subtitle: 'Tamper-Proof Digital Ballot powered by SHA-256 Blockchain',
    candidates: [
      {
        id: 'CAND-01',
        name: 'Rajeshwari Devi',
        party: 'Rashtriya Pragati Dal',
        symbol: '☀️',
        color: '#EA580C',
        manifesto: 'Digital public infrastructure, rural broadband connectivity, startup incentives, and transparent governance.'
      },
      {
        id: 'CAND-02',
        name: 'Siddharth Malhotra',
        party: 'Jan Vikas Morcha',
        symbol: '🏛️',
        color: '#2563EB',
        manifesto: 'Modern public healthcare clinics, skill-based youth employment, and clean drinking water for every ward.'
      },
      {
        id: 'CAND-03',
        name: 'Kavita Deshmukh',
        party: 'Lok Shakti Party',
        symbol: '🌾',
        color: '#16A34A',
        manifesto: 'Smart agriculture subsidies, direct benefit transfers, women safety networks, and solar microgrids.'
      },
      {
        id: 'CAND-04',
        name: 'Imran Qureshi',
        party: 'Yuva Bharat Coalition',
        symbol: '⚖️',
        color: '#9333EA',
        manifesto: 'Strict cybersecurity & data privacy laws, affordable urban transit, and merit-based education grants.'
      }
    ],
    voters: [
      { voter_id: 'IND-1001', name: 'Amitabh Roy', dob: '1992-07-12', pin: '1234' },
      { voter_id: 'IND-1002', name: 'Pooja Kumari', dob: '1998-03-25', pin: '1234' },
      { voter_id: 'IND-1003', name: 'Deepak Yadav', dob: '1989-12-04', pin: '1234' },
      { voter_id: 'IND-1004', name: 'Neha Joshi', dob: '2001-09-19', pin: '1234' },
      { voter_id: 'IND-1005', name: 'Karthik Iyer', dob: '1995-06-08', pin: '1234' }
    ]
  }
};

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSql(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDb();
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS election_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      party TEXT NOT NULL,
      symbol TEXT NOT NULL,
      color TEXT NOT NULL,
      manifesto TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS voters (
      voter_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dob TEXT NOT NULL DEFAULT '2000-01-01',
      pin_hash TEXT NOT NULL,
      has_voted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blocks (
      block_index INTEGER PRIMARY KEY,
      timestamp TEXT NOT NULL,
      transactions_json TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      nonce INTEGER NOT NULL,
      hash TEXT NOT NULL
    );
  `);

  // Ensure dob column exists if loading an older evoting.sqlite file
  const cols = queryAll('PRAGMA table_info(voters)');
  if (!cols.some((c) => c.name === 'dob')) {
    db.run("ALTER TABLE voters ADD COLUMN dob TEXT NOT NULL DEFAULT '2000-01-01';");
    saveDb();
  }
}

function seedTheme(themeKey = 'COLLEGE') {
  const safeKey = THEMES[themeKey] ? themeKey : 'COLLEGE';
  const theme = THEMES[safeKey];

  db.run('DELETE FROM election_config;');
  db.run('DELETE FROM candidates;');
  db.run('DELETE FROM voters;');
  db.run('DELETE FROM blocks;');

  const configPairs = [
    ['theme', safeKey],
    ['title', theme.title],
    ['subtitle', theme.subtitle],
    ['status', 'ACTIVE']
  ];
  for (const [k, v] of configPairs) {
    db.run('INSERT INTO election_config (key, value) VALUES (?, ?)', [k, v]);
  }

  for (const c of theme.candidates) {
    db.run(
      'INSERT INTO candidates (id, name, party, symbol, color, manifesto) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.party, c.symbol, c.color, c.manifesto]
    );
  }

  const now = new Date().toISOString();
  for (const v of theme.voters) {
    const pinHash = bcrypt.hashSync(v.pin, 8);
    db.run(
      'INSERT INTO voters (voter_id, name, dob, pin_hash, has_voted, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [v.voter_id, v.name, v.dob, pinHash, now]
    );
  }

  const genesis = mineBlock(
    0,
    '0'.repeat(64),
    now,
    [{ type: 'GENESIS', message: `BlockVote Genesis Block (${safeKey} Election 2026)` }]
  );
  db.run(
    'INSERT INTO blocks (block_index, timestamp, transactions_json, previous_hash, nonce, hash) VALUES (?, ?, ?, ?, ?, ?)',
    [
      genesis.block_index,
      genesis.timestamp,
      genesis.transactions_json,
      genesis.previous_hash,
      genesis.nonce,
      genesis.hash
    ]
  );

  saveDb();
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    createSchema();
    const blockCount = queryOne('SELECT COUNT(*) as cnt FROM blocks');
    if (!blockCount || blockCount.cnt === 0) {
      seedTheme('COLLEGE');
    }
  } else {
    db = new SQL.Database();
    createSchema();
    seedTheme('COLLEGE');
  }
  console.log('✅ SQLite Database initialized at:', DB_FILE);
}

function getConfig() {
  const rows = queryAll('SELECT key, value FROM election_config');
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return {
    theme: cfg.theme || 'COLLEGE',
    title: cfg.title || THEMES.COLLEGE.title,
    subtitle: cfg.subtitle || THEMES.COLLEGE.subtitle,
    status: cfg.status || 'ACTIVE'
  };
}

function validateChain() {
  const blocks = queryAll('SELECT * FROM blocks ORDER BY block_index ASC');
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    const recalculated = calculateBlockHash(
      cur.block_index,
      cur.previous_hash,
      cur.timestamp,
      cur.transactions_json,
      cur.nonce
    );
    if (cur.hash !== recalculated) {
      return {
        valid: false,
        corruptedBlockIndex: cur.block_index,
        reason: `Block #${cur.block_index} hash mismatch! Stored data was altered without re-mining.`
      };
    }
    if (i > 0) {
      const prev = blocks[i - 1];
      if (cur.previous_hash !== prev.hash) {
        return {
          valid: false,
          corruptedBlockIndex: cur.block_index,
          reason: `Block #${cur.block_index} previousHash link is broken!`
        };
      }
    }
  }
  return {
    valid: true,
    corruptedBlockIndex: null,
    reason: 'All blocks and SHA-256 cryptographic hashes are 100% intact.'
  };
}

function hasVoterVotedOnChain(voterId) {
  const targetHash = hashVoterId(voterId);
  const blocks = queryAll('SELECT transactions_json FROM blocks WHERE block_index > 0');
  for (const b of blocks) {
    try {
      const txs = JSON.parse(b.transactions_json);
      for (const tx of txs) {
        if (tx.type === 'VOTE' && tx.voterHash === targetHash) {
          return true;
        }
      }
    } catch {
      // ignore malformed
    }
  }
  return false;
}

module.exports = {
  DIFFICULTY,
  THEMES,
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
};
