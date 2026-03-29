# FraudShield: Forensic Cyber Fraud Detection System 🛡️

**FraudShield** is a specialized forensic analysis platform designed for the **Anantapur Police Cyber Unit**. It provides deep-dive investigative tools to track, visualize, and freeze fraudulent financial networks in real-time, specifically focused on Demat and high-layer financial fraud.

---

## 🚀 Key Features

### 1. **Live Forensic Dashboard**
- **Real-Time Tabbed Interface**: Toggle seamlessly between a dynamic network graph visualization and a granular, row-by-row transaction table.
- **MongoDB Data Integration**: Ingest live and mock case data directly from a robust database cluster.
- **Deterministic Risk Scoring**: A backend rules engine that mathematically scores transactions for velocity spikes, dormancy, and first-time receiver anomalies.

### 2. **Investigation Graph Network**
- **Isolated Subgraph Rendering**: Target specific transactions and instantly isolate their direct network trees for focused investigation.
- **Deterministic Tree Mapping**: Visualize the complex flow of funds from victims (Layer 1) to endpoint mules (Layer 7).

### 3. **Enforcement & Legal Action**
- **Legal Notice Generation (Section 91 CrPC)**: Instantly generate and download official legal notices (PDFs) for bank freeze requests directly from the forensic view.
- **Hold Trace Propagation**: Propagate transaction freezes down an entire branch of the network with one click.
- **Recoverable Amount Tracking**: Real-time calculation of potential fund recovery versus lost assets.

---

## 🛠️ Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, React Flow, Lucide Icons.
- **Backend**: FastAPI (Python 3.12), Motor (Async MongoDB), Pandas (Forensic Data Processing).
- **Database**: MongoDB (Atlas/Local).
- **Deployment**: Optimized for Render (Backend) and Vercel (Frontend).

---

## 💻 Local Setup

### Backend
1. Navigate to `backend/`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate it: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux).
4. Install dependencies: `pip install -r requirements.txt`.
5. Create a `.env` file:
   ```env
   MONGODB_URL="your_mongodb_connection_string"
   DATABASE_NAME="fraudshield"
   ```
6. Run the server: `uvicorn main:app --reload`.

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Run the development server: `npm run dev`.

---

## ☁️ Deployment Guide

### **Backend (Render)**
- **Root**: `backend/`
- **Build**: `pip install -r requirements.txt`
- **Start**: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
- **Env Vars**: Set `MONGODB_URL` and `DATABASE_NAME`.

### **Frontend (Vercel)**
- **Root**: `frontend/`
- **Framework**: Vite
- **Build**: `npm run build`
- **Output**: `dist`
- **Env Vars**: Set `VITE_API_URL` to your Render backend URL.

---

## 📊 Forensic Dataset
The system is synchronized with the `train_final (1).csv` dataset. This file must be present in the `backend/` directory for the **"Load Real Case"** feature to function in production environments.

---

**Developed for the Anantapur Police Hackathon** 🇮🇳
