# BlockVote v3 — Blockchain-Based E-Voting System (React + Node.js + SQLite + JWT)

A complete, demo-ready **Blockchain-Based E-Voting System** with **SQLite database persistence**, **JWT authentication**, **bcrypt PIN security**, **SHA-256 Proof-of-Work blockchain**, and a **modern Dark/Light UI**.

## Implemented Features
- **Tech Stack (1C):** React + Vite + Tailwind CSS frontend, Node.js + Express backend, **SQLite (`evoting.sqlite`)** database (zero native C++ build errors on Windows via `sql.js`), and **JWT Token Authentication** (`jsonwebtoken` + `bcryptjs`).
- **Voter Auth & Security (2A, 2C, 2D, 2E):**
  - Voter ID + PIN JWT Login
  - Live New Voter Registration directly into SQLite with **Date of Birth (18+ Age Eligibility Check)** on both frontend & backend
  - Strict Double-Voting Block (both SQLite & Blockchain verification)
  - Voter Privacy via salted SHA-256 Anonymized Voter Hash
- **Modern UI/UX (3A, 3B, 3C, 3D):**
  - Clean responsive design + **Dark / Light Mode Toggle**
  - Visual Candidate Cards (symbol, party, manifesto)
  - Vote Confirmation Modal + Cryptographic Receipt
  - **Print Receipt** & **Download Receipt (.txt)** buttons
- **Blockchain & Security Demo (4A, 4B, 4C, 4D):**
  - **Proof-of-Work Mining Animation** showing live nonce & SHA-256 hash solving
  - Live Blockchain Explorer (Block #, Timestamp, Nonce, Previous Hash, Current Hash)
  - **Simulate Hack / Tamper Attack** button that modifies a SQLite block and triggers immediate SHA-256 corruption alerts
  - Transaction ID **Receipt Verifier**
- **Live Results & Admin Panel (5A, 5B, 5C, 5D):**
  - Live Results Dashboard with **Visual Bar Chart**, Progress Bars & Voter Turnout %
  - **Winner Announcement Banner** when Admin clicks *End Election*
  - JWT-protected Admin Panel (Add/Remove Candidates, Register Voters, Start/Pause/End Election, 1-Click Reset)
  - **Export Results Report (CSV Download)**
- **Dual Election Themes (6A & 6B):**
  - Switch in 1 click inside Admin Panel between **College Student Council Election** and **Indian General Civic Election** (both with pre-loaded demo candidates & voters).

## How to Run on Windows (Super Easy)

### Option 1: 1-Click Start
Simply double-click **`start-demo.bat`** inside the extracted folder. It will automatically run `npm install` (first time only) and open both Backend (`http://localhost:5000`) and Frontend (`http://localhost:5173`).

### Option 2: Manual (Two Terminals)
1. **Backend:**
   ```powershell
   cd backend
   npm install
   npm start
   ```
2. **Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
Open **http://localhost:5173** in your browser.

## Demo Credentials
- **College Theme Voters:** `STU-1001` to `STU-1005` | **PIN:** `1234`
- **Indian Civic Theme Voters:** `IND-1001` to `IND-1005` | **PIN:** `1234`
- **Admin Dashboard PIN:** `admin123`
