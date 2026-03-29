# FraudShield: Comprehensive Forensic Documentation 🛡️

**FraudShield** is an advanced cyber-forensics platform designed specifically for the **Anantapur Police Cyber Unit**. This document provides a detailed breakdown of every feature, the rationale behind its inclusion, and the technical stack used for implementation.

---

## 🚀 Core Features & Rationale

### 1. **Interactive Guided Tour**
- **What it does**: An interactive walkthrough that guides new investigators through the dashboard and graph features.
- **Why it's there**: Forensic tools can be complex. This ensures that any officer, regardless of technical background, can effectively use the platform from day one.
- **Tech Stack**: **React Joyride**.
- **Rationale**: Joyride is the gold standard for React-based onboarding, allowing for step-by-step element highlighting without complex state management.

### 2. **Live Transaction Dashboard & Summary Widgets**
- **What it does**: Real-time monitoring of all ingested transactions with high-level summary cards (Total Ingested, High Risk Alerts, Looted Assets).
- **Why it's there**: Provides immediate situational awareness. Investigators can see the scale of the fraud at a glance before diving into specific accounts.
- **Tech Stack**: **Lucide React** (Icons) + **FastAPI Aggregation**.
- **Rationale**: Using MongoDB's aggregation pipeline on the backend ensures that summary numbers are calculated in real-time without slowing down the dashboard.

### 3. **Automated Forensic Ingestion (One-Click Ingestion)**
- **What it does**: Automatically processes complex multi-layer CSV datasets (like `train_final (1).csv`) and reconstructs the entire fraud chain.
- **Why it's there**: Manual data entry for 50+ transactions across 7 layers is impossible during an active investigation. This automates the forensic reconstruction.
- **Tech Stack**: **Pandas** + **FastAPI**.
- **Rationale**: Pandas is used for its superior data manipulation capabilities, ensuring that even large CSV files are processed and layered correctly in seconds.

### 4. **Multi-Layer Risk Scoring Engine**
- **What it does**: Evaluates transactions against patterns like *Layering Detection*, *Money Mule Profiling*, and *Velocity Spikes*.
- **Why it's there**: To move beyond simple "High/Low" flags. It provides a deterministic risk score (0-1) based on real-world cybercrime behavior.
- **Tech Stack**: **Python Logic** + **MongoDB**.
- **Rationale**: Python allows for complex mathematical scoring, while MongoDB's flexible schema stores the "Audit Trace" so investigators can see *why* a score was given.

### 5. **Interactive Investigation Graph (FFAP Trace)**
- **What it does**: A directed graph visualization showing fund flows from victims (Layer 1) to exit points (Layer 7).
- **Why it's there**: Humans process visual connections better than rows of data. It makes the "laundering hubs" immediately visible.
- **Tech Stack**: **React Flow** + **NetworkX**.
- **Rationale**: React Flow provides a high-performance, zoomable canvas, while NetworkX handles the backend graph theory (depth, pathfinding).

### 6. **Network Summary Dashboard (Graph View)**
- **What it does**: A specialized sidebar in the graph view showing total looted, recoverable amounts, and the number of identified mule accounts.
- **Why it's there**: To help investigators prioritize which accounts to freeze first based on where the most money is currently sitting.
- **Tech Stack**: **Lucide React** + **Tailwind CSS**.
- **Rationale**: Tailwind allows for a "glassmorphism" UI that keeps the focus on the data without distracting from the graph.

### 7. **Risk Evidence Visualizer**
- **What it does**: Displays the specific "Factors" and "Reasons" behind an account's risk score (e.g., "High throughput but stays empty").
- **Why it's there**: In court, a "Risk Score" isn't enough; investigators need evidence. This provides the forensic proof required for legal action.
- **Tech Stack**: **React Component Architecture**.
- **Rationale**: Breaking this into a modular React component allows it to be reused in both the Dashboard and the Graph View.

### 8. **Hold Trace Propagation (One-Click Freeze)**
- **What it does**: Freezes an account and all its downstream "child" nodes in one click.
- **Why it's there**: Speed is critical. If a mule transfers money while an investigator is clicking "Freeze" on each node individually, the money is lost.
- **Tech Stack**: **Asynchronous Python (Motor)**.
- **Rationale**: Using the asynchronous Motor driver allows the system to update dozens of database records simultaneously, ensuring near-instant propagation.

### 9. **Bank API Simulation**
- **What it does**: Simulates the real-time API response from banks (SBI, IOB, KVB) when a freeze request is sent.
- **Why it's there**: To demonstrate how the system would integrate with actual banking infrastructure in a production environment.
- **Tech Stack**: **React State Management**.
- **Rationale**: Using React's `ref` and state allows us to trigger the simulation independently for each node without a full page reload.

### 10. **Legal Notice Generation (Section 91 CrPC)**
- **What it does**: Instantly generates a formatted Section 91 notice as a `.txt` file for the specific bank and account.
- **Why it's there**: Police must issue legal notices to banks to legally freeze accounts. This automates the paperwork, saving hours of manual drafting.
- **Tech Stack**: **Client-side Blob API**.
- **Rationale**: Generating the file on the client-side ensures that sensitive data doesn't need to be sent back to the server just to be formatted, enhancing security.

### 11. **System Trace Timeline**
- **What it does**: Shows a chronological list of every event for a specific account (Funds Received, Funds Sent, Freeze Applied).
- **Why it's there**: Provides a granular forensic timeline of the crime, which is essential for building a legal case.
- **Tech Stack**: **Tailwind Scrollbars** + **Lucide History**.
- **Rationale**: Custom scrollbars and a compact timeline design allow for hundreds of events to be viewed in a small sidebar.

---

## 🛠️ Tech Stack Rationale (Overall)

### **Backend: FastAPI (Python 3.12)**
- **Why**: Fastest Python framework for asynchronous operations. Forensic data requires high-speed processing, and FastAPI's native support for `async/await` is perfect for this.

### **Database: MongoDB (NoSQL)**
- **Why**: Banking data is polymorphic and often has varying fields. NoSQL's flexible schema allows us to store "Audit Traces" and "Financial Profiles" without rigid constraints.

### **Frontend: React 18 + Vite**
- **Why**: Vite provides the fastest development cycle (HMR), while React 18 handles complex UI states (like the investigation graph) with high performance.

### **Styling: Tailwind CSS**
- **Why**: Allows for a consistent, professional "Cyber Intelligence" aesthetic (Dark Mode, High-Contrast alerts) with minimal code overhead.

---

**Developed for the Anantapur Police Cyber Unit** 🇮🇳
