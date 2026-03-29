# FraudShield: Forensic Cyber Fraud Detection & Recovery System 🛡️

**FraudShield** is a specialized forensic platform engineered for law enforcement and cybercrime units. It transforms raw financial data into actionable intelligence, enabling investigators to track, visualize, and freeze fraudulent networks in real-time.

---

## 🚀 Core Features & Rationale

### 1. **Automated Forensic Ingestion**
- **What it does**: Ingests complex financial datasets (CSV/JSON) and automatically reconstructs the fraud chain.
- **Why it's there**: Manual reconstruction of multi-layer fraud (Layer 1 to Layer 7) is time-consuming and prone to error. This feature reduces days of manual work to seconds.
- **Tech Stack**: **Pandas** (Python) + **FastAPI**.
- **Rationale**: Pandas is the industry standard for high-performance data manipulation, handling thousands of rows with minimal memory footprint. FastAPI provides the asynchronous bridge to ingest this data without blocking the user interface.

### 2. **Multi-Layer Risk Scoring Engine**
- **What it does**: Evaluates every transaction against forensic rules: *Velocity Spikes*, *Dormancy Reactivation*, *Layering Patterns*, and *Money Mule Profiling*.
- **Why it's there**: To provide a deterministic "Risk Score" (0.0 to 1.0) that tells an investigator exactly how suspicious a transaction is based on confirmed cyber-fraud patterns.
- **Tech Stack**: **Python (Custom Logic)** + **MongoDB**.
- **Rationale**: Python allows for complex, readable business logic that can be easily updated as fraud patterns evolve. MongoDB's flexible schema allows us to store varying "audit traces" for different types of risk evaluations.

### 3. **Interactive Investigation Graph (FFAP Trace)**
- **What it does**: Visualizes the flow of stolen funds from the victim source to endpoint exit points using a directed graph.
- **Why it's there**: Fraudsters use "layering" to hide funds. A graph visualization makes these hidden links obvious, highlighting "Money Laundering Hubs" that would be invisible in a spreadsheet.
- **Tech Stack**: **React Flow** + **NetworkX** (Backend).
- **Rationale**: **NetworkX** handles the complex graph theory (finding paths, calculating node depth) on the backend, while **React Flow** provides a high-performance, interactive canvas on the frontend that can handle hundreds of nodes smoothly.

### 4. **Hold Trace Propagation (One-Click Freeze)**
- **What it does**: Allows an investigator to freeze an entire "branch" of the fraud network instantly.
- **Why it's there**: In cybercrime, the "Golden Hour" is critical. If funds aren't frozen within minutes, they are withdrawn as cash. Propagation ensures that freezing one mule account automatically protects all downstream funds.
- **Tech Stack**: **Asynchronous Python (Motor)**.
- **Rationale**: Speed is everything. **Motor** (Async MongoDB driver) allows the system to fire off dozens of "Freeze" updates simultaneously without waiting for each one to finish, ensuring the fastest possible response time.

### 5. **Bank API Simulation & Legal Notice Generation**
- **What it does**: Simulates communication with banking APIs (SBI, IOB, etc.) and generates auto-filled legal notices (Section 91 CrPC).
- **Why it's there**: To bridge the gap between "detecting" fraud and "acting" on it. It prepares the legal paperwork required by banks immediately.
- **Tech Stack**: **Lucide React** + **Client-side Blob API**.
- **Rationale**: Generating notices on the client-side (using Blob) ensures that sensitive legal documents are created instantly without needing a round-trip to the server, enhancing privacy and speed.

---

## 🛠️ Tech Stack & Architectural Decisions

### **Backend: FastAPI (Python 3.12)**
- **Why**: Fastest Python web framework. Its native support for `async/await` is critical for a system that constantly queries a database and processes large datasets simultaneously.

### **Database: MongoDB (NoSQL)**
- **Why**: Transaction data is often messy and varies between banks. NoSQL provides the "Schema-on-Read" flexibility needed to store diverse banking formats while maintaining high-speed indexing for "Account ID" lookups.

### **Frontend: React 18 + Vite**
- **Why**: Vite provides a near-instant development cycle. React's component-based architecture allows us to build complex investigative tools (like the Graph and the Live Table) as independent, high-performance modules.

### **Styling: Tailwind CSS**
- **Why**: Allows for a "Cyber-Intelligence" aesthetic (dark mode, high-contrast alerts) with minimal CSS overhead, ensuring the dashboard remains responsive even on low-end police station hardware.

---

**Developed for the Anantapur Police Cyber Unit** 🇮🇳
