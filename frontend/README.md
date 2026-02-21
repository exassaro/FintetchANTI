# 🇮🇳 GSTAnalytica — Frontend

Premium React.js dashboard for the GST Analytics Platform. Orchestrates the full **Classification → Anomaly Detection → Analytics** pipeline.

---

## 🛠️ Tech Stack

| Library | Purpose |
|---|---|
| **React 18** + Vite | Core framework + build tool |
| **React Router v6** | Client-side routing |
| **Recharts** | Charts (Area, Bar, Pie, Line, Radar, Composed) |
| **Axios** | HTTP client for microservice API calls |
| **Lucide React** | Icon library |
| **Vanilla CSS** | Custom design system (no Tailwind/UI libraries) |

---

## 🏗️ Architecture

```
frontend/
├── src/
│   ├── api/
│   │   ├── classification.js   → Classification service (port 8001)
│   │   ├── anomaly.js          → Anomaly service (port 8002)
│   │   └── analytics.js        → Analytics service (port 8003)
│   ├── context/
│   │   └── PipelineContext.jsx → Global pipeline state (uploadId, stage)
│   ├── components/
│   │   ├── Layout.jsx          → Sidebar + Outlet wrapper
│   │   └── Sidebar.jsx         → Pipeline-aware navigation
│   ├── pages/
│   │   ├── UploadPage.jsx      → CSV upload + full pipeline trigger
│   │   ├── DashboardPage.jsx   → Summary KPIs, charts, anomaly stats
│   │   ├── KPIPage.jsx         → Financial + compliance KPIs, radar chart
│   │   ├── TimeSeriesPage.jsx  → Monthly metric line chart
│   │   ├── ForecastPage.jsx    → ARIMA/Prophet 6-month forecast
│   │   ├── DistributionPage.jsx→ Vendor/category spend distribution
│   │   ├── ReviewPage.jsx      → Human review queue with decisions
│   │   └── ChatbotPage.jsx     → AI chatbot with intent display
│   ├── index.css               → Full design system (tokens, layout, components)
│   ├── App.jsx                 → Router with all routes
│   └── main.jsx                → Entry point
├── vite.config.js              → Proxy config for CORS-free dev
└── index.html                  → SEO-optimised HTML shell
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- All three backend microservices running:
  - Classification Service → `http://localhost:8001`
  - Anomaly Service → `http://localhost:8002`
  - Analytics Service → `http://localhost:8003`

### Install & Run

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 🔄 Pipeline Flow

```
User uploads CSV
       ↓
POST /classify/upload          ← Classification Service (8001)
Returns: upload_id, schema, rows_processed
       ↓
POST /anomaly/run/{upload_id}  ← Anomaly Detection Service (8002)
Returns: anomaly_count, avg_score, threshold
       ↓
Analytics pages unlock         ← Analytics Service (8003)
Dashboard / KPIs / Forecast / Distribution / Review / Chatbot
```

---

## 🧭 Routes

| Route | Page | Requires |
|---|---|---|
| `/` | Upload & Pipeline | Always |
| `/dashboard` | Summary Dashboard | After anomaly detection |
| `/kpi` | KPI Reports | After anomaly detection |
| `/time-series` | Monthly Time Series | After anomaly detection |
| `/forecast` | 6-Month Forecast | After anomaly detection |
| `/distribution` | Vendor/Category Charts | After anomaly detection |
| `/review` | Human Review Queue | After anomaly detection |
| `/chatbot` | AI Chatbot | After anomaly detection |

> Analytics routes are **locked** in the sidebar until the full pipeline completes. They unlock progressively as pipeline stages finish.

---

## ⚙️ Vite Proxy (CORS-Free Dev)

The `vite.config.js` proxies all API calls through port `3000`, avoiding CORS:

```
/classify/*  → http://localhost:8001
/anomaly/*   → http://localhost:8002
/dashboard/* → http://localhost:8003
/kpi/*       → http://localhost:8003
/forecast/*  → http://localhost:8003
/time-series/* → http://localhost:8003
/distribution/* → http://localhost:8003
/review/*    → http://localhost:8003
/chatbot/*   → http://localhost:8003
```

---

## 🎨 Design System

The CSS design system (`index.css`) provides:
- **CSS Variables** for all colors, gradients, spacing, shadows
- **Dark glassmorphism** theme (`--bg-primary: #050b18`)
- **KPI cards** with gradient top borders and glow hover effects
- **Pipeline visualiser** with animated connectors
- **Responsive grid** (`grid-2`, `grid-3`, `kpi-grid`)
- **Animated fade-in** for all page elements
- **Chat UI** components

---

## 📦 Build for Production

```bash
npm run build
# Output: dist/
```
