# FraudShield: Forensic Cyber Fraud Detection System 🛡️

**FraudShield** is a specialized forensic analysis platform designed for the **Anantapur Police Cyber Unit**. It provides deep-dive investigative tools to track, visualize, and freeze fraudulent financial networks in real-time, specifically focused on Demat and high-layer financial fraud.

---

## 🚀 Key Features

### 1. **Cinematic Intelligence Entry**
- **Animated Splash Screen**: A professional, authoritative entrance sequence featuring the Anantapur Police insignia and a 7-second high-fidelity animation.
- **Montserrat & Inter Typography**: Optimized for readability and an "Intelligence Unit" aesthetic.

### 2. **Live Forensic Dashboard**
- **Real-Time Monitoring**: Tracks all transaction flows through the forensic engine.
- **Demat Case Ingestion**: One-click ingestion of the `train_final (1).csv` dataset, reconstructing complex fraud trees automatically.
- **Automated Risk Scoring**: Every transaction is evaluated for "Deep Chain" patterns and "Night-time" anomalies.

### 3. **Investigation Graph Network**
- **Deterministic Tree Mapping**: Visualizes the flow of funds from victims (Layer 1) to endpoint mules (Layer 7).
- **Node Intelligence**: Color-coded nodes highlighting high looted amounts and confirmed fraud status.
- **Interactive Forensics**: Click any node to view bank-level communication logs and recovery timelines.

### 4. **Enforcement & Recovery**
- **Hold Trace Propagation**: Freeze an entire branch of the network instantly.
- **Bank API Simulation**: Live simulation of freeze requests sent to major banks (SBI, IOB, KVB).
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
