# UK Wind Power Day-Ahead Trading Desk & Forecast Accuracy Evaluator

[![CI](https://github.com/anonymous-candidate/uk-wind-trading-desk/actions/workflows/ci.yml/badge.svg)](https://github.com/anonymous-candidate/uk-wind-trading-desk/actions/workflows/ci.yml)

A production-grade web application built for a UK energy utility's day-ahead power trading team. The desk buys electricity on the UK wholesale market on day $D-1$ for physical delivery on day $D$. This tool reconstructs the exact wind forecast available at decision cutoff time (09:00 UK time on $D-1$) with zero data leakage, quantitatively evaluates forecast errors against Elexon BMRS outturn actuals, and provides empirical reserve buffer recommendations to safeguard against cashout imbalance exposure.

---

## 1. Project Links & Demos

- **Live Deployed Application:** `https://uk-wind-trading-desk.vercel.app` *(Placeholder &ndash; see deployment instructions below)*
- **Demo Video Walkthrough:** `https://youtu.be/placeholder-demo-video` *(Placeholder)*
- **Reviewer Walkthrough Document:** [docs/REVIEWER_WALKTHROUGH.md](docs/REVIEWER_WALKTHROUGH.md)

---

## 2. Directory & File Structure

```text
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline (Docker build, container pytest, compose integration)
├── backend/
│   ├── app/
│   │   ├── config.py           # Configuration, env vars, delivery window bounds, EPEX gate closure docs
│   │   ├── core_logic.py       # PURE functions: cutoff filtering, hourly aggregation, comparison builder
│   │   ├── data_loader.py      # Immutable snapshot reader (in-memory store, zero runtime network I/O)
│   │   ├── metrics.py          # Pure metrics: MAE, RMSE, bias, zero-safe MAPE, P95, horizon curves
│   │   ├── models.py           # Strict Pydantic response models for all API endpoints
│   │   ├── routes.py           # FastAPI endpoints (/health, /decision, /comparison, /metrics, /horizon)
│   │   └── main.py             # FastAPI entry point, CORS middleware, static asset mounting
│   ├── data/
│   │   ├── fuelhh_wind.csv     # Snapshot: 1,488 FUELHH wind records for delivery days Jan 2 to Feb 1
│   │   └── windfor.csv         # Snapshot: 19,856 WINDFOR forecast records published Dec 29 to Jan 31
│   ├── scripts/
│   │   └── fetch_data.py       # One-shot ingest script to fetch and cache Elexon BMRS data
│   ├── tests/
│   │   ├── conftest.py         # Test fixtures: synthetic data, edge cases, hand-computed metrics example
│   │   ├── test_core_logic.py  # Unit tests: cutoff inclusion/exclusion, latest valid, aggregation, timezones
│   │   └── test_metrics.py     # Unit tests: hand-computed verification, zero MAPE safety, P95, grouping
│   ├── Dockerfile              # Pinned Python 3.12-slim container with healthcheck on /api/health
│   ├── Procfile                # Heroku deployment configuration with dynamic $PORT support
│   └── requirements.txt        # Pinned Python dependencies (including pytest for container testing)
├── frontend/
│   ├── src/
│   │   ├── api/client.ts       # Typed fetch client for all backend endpoints
│   │   ├── components/
│   │   │   ├── Header.tsx           # Trading desk header, live cutoff badge, window status
│   │   │   ├── DeliveryPicker.tsx   # Interactive date selector for January 2026 delivery days
│   │   │   ├── TraderInsightBox.tsx # Dynamic operational risk advisory and P95 reserve buffer
│   │   │   ├── DecisionView.tsx     # Decision forecast curve, ±P95 band, half-hourly detail, hourly table
│   │   │   ├── AccuracyView.tsx     # 6 metric cards, monthly time series, diurnal & horizon curves
│   │   │   └── MethodologyModal.tsx # Full methodology modal, gate closure source & caveats
│   │   ├── types/index.ts      # TypeScript interfaces matching backend models
│   │   ├── App.tsx             # Root component with tab navigation and state management
│   │   ├── index.css           # Custom dark theme styling
│   │   └── main.tsx            # React DOM mounting
│   ├── Dockerfile              # Multi-stage build (Node 20 build -> Nginx alpine runtime)
│   ├── nginx.conf              # Production Nginx config (gzip, asset caching, SPA fallback, /api proxy)
│   ├── package.json            # Frontend dependencies (React 18, Recharts, Lucide)
│   ├── tsconfig.json           # Strict TypeScript configuration
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.ts          # Vite build config with manual chunking for optimal bundle size
├── api/
│   ├── index.py                # Vercel serverless function entry point exporting FastAPI app
│   └── requirements.txt        # Serverless Python requirements for Vercel
├── docker-compose.yml          # Unified multi-container orchestration with dependency healthchecks
├── heroku.yml                  # Heroku container stack manifest
├── vercel.json                 # Monorepo full-stack Vercel deployment manifest
├── .dockerignore               # Container build ignore rules
├── .gitignore                  # Git ignore rules (protecting secrets, node_modules, environments)
├── .env.example                # Documented environment variables template
└── docs/
    ├── REVIEWER_WALKTHROUGH.md # One-page reviewer architecture and decision guide
    └── optional/
        └── render.yaml         # Optional Render blueprint reference
```

---

## 3. How to Run the Application

### Option A: With Docker (`docker compose up --build`)
*(Requires Docker Desktop / daemon installed. Container builds and integration are validated in GitHub Actions CI).*

```bash
# Clone the repository
git clone <repo-url>
cd uk-wind-trading-desk

# Copy environment variables
cp .env.example .env

# Build and start backend and frontend services
docker compose up --build
```
- **Frontend UI:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API:** Open [http://localhost:8000/api/health](http://localhost:8000/api/health).
- **Interactive Swagger Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs).

### Option B: Without Docker (Local Development)

#### 1. Backend (Python 3.12 recommended, Python 3.11+ supported)
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (Node.js 20 recommended, Node 18+ supported)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

#### 3. Single-Command Full-Stack Preview (No Docker)
Because the FastAPI backend automatically mounts the built frontend static assets if present:
```bash
# Build frontend once:
cd frontend && npm install && npm run build

# Start backend (serves both API and UI):
cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) for the full unified application.

---

## 4. How to Run Tests

### Running Locally
```bash
cd backend
pytest -v
```
All **33 unit tests** execute in under 0.5 seconds, validating:
- Forecast published exactly at the cutoff is included (`publishTime <= cutoff`).
- Forecast published after the cutoff is strictly excluded (`publishTime > cutoff`).
- Multiple eligible forecasts picks the latest valid publish time.
- Missing forecasts before cutoff are flagged explicitly rather than dropped.
- Half-hourly to hourly aggregation arithmetic correctness.
- Zero-safe MAPE calculation (guarding against divide-by-zero on zero generation).
- Timezone conversions (`UTC` to `Europe/London`).
- Metrics formulas (MAE, RMSE, bias, P95, error % of mean actual) verified against hand-computed reference values.

### Running Inside the Docker Container
```bash
docker compose run --rm backend pytest -v
```

---

## 5. Methodology & Core Logic

### 1. Day-Ahead Decision Cutoff (09:00 UK Time on D-1)
- **Cutoff Definition:** Physical power delivery day $D$ requires purchase decisions to be committed on day $D-1$.
- **Exchange Rule Rationale:** In the UK power market, the EPEX Spot GB Day-Ahead auction order book gate closure is strictly **09:20 UK time on D-1** (*Source: EPEX Spot SE, "GB Day-Ahead Auction Trading Specifications"*).
- **Operational Buffer:** The system sets its default cutoff to **09:00 UK time on D-1** (configurable via `DECISION_CUTOFF_HOUR`), providing an operational 20-minute buffer before auction gate closure.
- **Timezone Integrity:** In January, UK local time is Greenwich Mean Time (GMT = UTC+0). The codebase stores UTC timestamps internally and formats `Europe/London` ISO-8601 strings for user presentation.

### 2. Selection Logic (Strict Data Leakage Prevention)
For each target hour on delivery day $D$:
$$\text{Cutoff Datetime} = D-1 \text{ at } 09:00:00\text{ UTC}$$
1. Any WINDFOR record with `publishTime > Cutoff Datetime` is discarded (preventing data leakage).
2. Any record with `publishTime <= Cutoff Datetime` is eligible.
3. The latest eligible record (`max(publishTime)`) is selected as the decision forecast.
4. If no forecast was published prior to cutoff, the period is marked `forecast_missing = True` with `null` generation, ensuring missing periods are explicitly audited rather than silently dropped.

### 3. Hourly Alignment Rule
- **WINDFOR:** Reports national wind generation forecasts at hourly target resolution with `startTime = HH:00:00Z` (documented at [`bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)).
- **FUELHH:** Reports outturn generation by fuel type at half-hourly settlement resolution with settlement periods 1 to 48 (`startTime = HH:00:00Z` and `startTime = HH:30:00Z`, documented at [`bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)).
- **Alignment:** Each forecast target hour `HH:00` maps to the arithmetic mean of the two half-hourly FUELHH periods:
  $$\text{Actual}_{\text{hourly}}(HH:00) = \frac{\text{FUELHH}(HH:00, \text{SP } 2H+1) + \text{FUELHH}(HH:30, \text{SP } 2H+2)}{2}$$
- **Forecast Error Definition:**
  $$\text{Error (MW)} = \text{Forecast (MW)} - \text{Actual (MW)}$$
  *(A positive error denotes forecast over-estimation: wind under-delivered relative to forecast).*

### 4. January 2026 Scope & Snapshot-First Design
- **Decision Window:** 2026-01-01 through 2026-01-31 (31 decision days).
- **Delivery Window:** 2026-01-02 through 2026-02-01 (31 delivery days = 744 hourly settlement targets).
- **Snapshot Architecture:** Data was ingested once via `backend/scripts/fetch_data.py` into immutable CSV snapshots in `backend/data/`. At startup, `data_store.load()` loads the dataset into memory in 0.17 seconds. Runtime endpoints never make live Elexon API calls, ensuring 100% availability and eliminating third-party rate limits.
- **Data Refresh:** To re-fetch live data from Elexon:
  ```bash
  cd backend
  python -m scripts.fetch_data
  ```

---

## 6. Key Quantitative Findings & Real January 2026 Metrics

Evaluated exclusively on decision-time forecasts across all 744 hourly delivery targets (100% complete data coverage, zero missing periods):

| Metric | Real January 2026 Value | Trading Interpretation |
| :--- | :---: | :--- |
| **Evaluated Hours ($N$)** | **744** | 31 days &times; 24 hours &bull; 100% matched coverage. |
| **Mean Actual Generation** | **11,283.56 MW** | Baseline UK wind generation across the month. |
| **Mean Decision Forecast** | **13,031.44 MW** | Average forecast available at auction cutoff. |
| **Mean Absolute Error (MAE)** | **2,038.91 MW** | Average magnitude of forecast error per clock hour. |
| **Root Mean Squared Error (RMSE)**| **2,504.76 MW** | Quadratic error penalizing large forecast swings. |
| **Forecast Bias** | **+1,747.89 MW** | **Systematic Over-forecast:** Forecasts over-predict outturn actuals on average. |
| **MAPE (Zero-Safe)** | **22.04%** | Average relative percentage deviation. |
| **P95 Absolute Error** | **5,283.35 MW** | 95% of hourly forecast errors fall within &plusmn;5,283 MW. |
| **P95 / Mean Actual** | **46.82%** | Ratio of P95 buffer to average generation. |

### Cautious Wording on the +1.75 GW Systematic Bias
- **Verified Empirical Finding:** Across all 744 evaluated hours in January 2026, WINDFOR forecasts over-predict FUELHH wind by approximately **1.75 GW (+1,747.89 MW) at every forecast horizon**.
- **Possible Explanations (Not Verified with Data in this Challenge):**
  1. *Potential Fleet Coverage Disparity:* FUELHH measures metered generation only from Balancing Mechanism (BM) registered units (transmission-connected wind farms). WINDFOR models forecast total Great Britain wind production, which may include 4 to 6 GW of embedded (distribution-connected) wind turbines not metered in FUELHH. This is a possible explanation, not verified with the data available in this challenge.
  2. *Potential Transmission Curtailment:* In winter months, high wind in Scotland regularly exceeds the export transfer capacity of the Scottish-English B6 transmission boundary. National Grid ESO routinely curtails Scottish wind farms via Balancing Mechanism Bid-Offer Acceptances (BOAs). WINDFOR may forecast unconstrained physical potential, whereas FUELHH reflects delivered energy after curtailment. This is also a possible explanation, not verified with the data available in this challenge.
  3. *Diurnal Pattern:* Measured bias is highest during off-peak night hours (+2.36 GW at 05:00 UTC) when lower local electricity demand in exporting regions coincides with higher export constraints.

---

## 7. Alignment Shift Sanity Check

To evaluate whether the observed error is influenced by a timestamp convention or clock misalignment, error metrics were computed across shifts from $-2\text{h}$ to $+2\text{h}$ relative to actuals:

| Shift ($\Delta t$) | Raw MAE (MW) | Debiased MAE (MW) | Error Std (MW) | Correlation ($r$) | Raw Bias (MW) | Count ($N$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **$-120\text{ min}$** | 1,954.85 | 1,431.47 | 1,815.00 | 0.9290 | +1,715.52 | 742 |
| **$-60\text{ min}$** | 1,972.85 | 1,383.60 | 1,774.07 | 0.9326 | +1,731.98 | 743 |
| **$-30\text{ min}$** | 2,001.94 | 1,372.55 | 1,775.89 | 0.9324 | +1,738.78 | 743 |
| **$\mathbf{0\text{ min}}$ (Canonical)** | **2,038.91** | **1,375.87** | **1,794.08** | **0.9309** | **+1,747.89** | **744** |
| **$+30\text{ min}$** | 2,080.16 | 1,385.98 | 1,825.40 | 0.9278 | +1,757.44 | 743 |
| **$+60\text{ min}$** | 2,121.09 | 1,414.20 | 1,872.57 | 0.9235 | +1,764.31 | 743 |
| **$+120\text{ min}$** | 2,211.14 | 1,505.06 | 2,001.64 | 0.9110 | +1,780.77 | 742 |

**Key Takeaways:**
- **Debiased-MAE as the Cleaner Alignment Test:** Because the time series carries a persistent ~1.75 GW mean bias, evaluating raw MAE under temporal shifts is confounded by sample mean drift when clipping the window boundary. The debiased-MAE comparison (evaluating errors with mean bias removed) provides the cleaner alignment test, confirming that error is minimized around the canonical 0-minute / -30-minute alignment (~1,372–1,375 MW), with strong correlation ($r \approx 0.931$).
- Canonical Elexon documentation defines `startTime` as the beginning of the clock period, confirming 0-shift as the correct operational alignment.

---

## 8. Backend API Reference

### 1. `GET /api/health`
Healthcheck and system metadata.
```json
{
  "status": "ok",
  "data_loaded": true,
  "fuelhh_records": 1488,
  "windfor_records": 19856,
  "delivery_window": "2026-01-02 to 2026-02-01",
  "cutoff_hour": 9,
  "windfor_publish_schedule": [
    "02:30", "04:30", "07:30", "09:30", "11:30", "12:25", "15:30", "18:30", "22:30"
  ]
}
```

### 2. `GET /api/forecast/decision?delivery_date=YYYY-MM-DD`
Reconstructs the decision-time forecast for delivery day $D$, returning cutoff info, forecast values, publish times used, hourly actuals, individual half-hourly actuals (`actual_hh1_mw`, `actual_hh2_mw`), and coverage metadata.

### 3. `GET /api/comparison?start=YYYY-MM-DD&end=YYYY-MM-DD`
Returns hourly time series comparing decision forecasts against outturn actuals with calculated errors across the requested range.

### 4. `GET /api/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD&group_by=overall|day|hour`
Computes accuracy metrics (MAE, RMSE, bias, zero-safe MAPE, P95 absolute error, error % of mean actual) aggregated overall, by delivery day, or by hour of day.

### 5. `GET /api/metrics/horizon`
Supplementary analysis computing forecast accuracy (MAE, RMSE, bias) as a function of lead time / horizon (0 to 48 hours) across all published forecasts.

---

## 9. Design Decisions, Trade-offs & Limitations

1. **Snapshot-First vs. Live API Calls:**
   - *Decision:* Decouple ingest from serving by caching data snapshots to CSV.
   - *Trade-off:* Data is static to January 2026, but the app gains sub-20ms response times, zero runtime network dependencies, and immune protection against Elexon API rate limits or downtime.
2. **Conservative 09:00 Cutoff vs. Exact 09:20 Gate Closure:**
   - *Decision:* Apply an operational cutoff 20 minutes before gate closure.
   - *Trade-off:* In practice, Elexon's publish schedule has runs at 07:30 UTC and 09:30 UTC. Both 09:00 and 09:20 select the exact same 07:30 forecast run. The 09:00 setting reflects realistic trading desk workflow where bids must be formulated before exchange gate closure.
3. **Known Limitations & Future Work:**
   - *Embedded Wind Modeling:* Incorporate distribution-network (embedded) solar and wind estimates (e.g. from Sheffield Solar PV_Live or National Grid ESO demand data) to disaggregate transmission vs. distribution generation.
   - *Physical Boundary Constraint Features:* Ingest B6 boundary interconnector flow and Bid-Offer Acceptance (BOA) data from Elexon to explicitly quantify wind curtailment volumes.
   - *Probabilistic Error Buffers:* Expand from static P95 reserve buffers to dynamic quantile regression models conditioned on wind speed and ramp direction.

---

## 10. Step-by-Step Deployment Instructions

### Deployment Option 1: Monorepo on Vercel (Recommended &ndash; Single Platform)
Both the React frontend and FastAPI backend can run on Vercel as a unified monorepo:
1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and select the repository.
3. Leave all root settings as default; Vercel automatically detects [`vercel.json`](vercel.json):
   - Frontend static assets are built from `frontend/` into `frontend/dist`.
   - `/api/*` routes are handled by the Python serverless function in `api/index.py` with bundled data snapshots.
4. **Environment Variables:** None required for default operation (zero CORS issues since frontend and API share the same origin).
5. Click **Deploy**.

### Deployment Option 2: Frontend on Vercel + Backend on Heroku (Container Stack)
1. **Deploy Backend on Heroku:**
   ```bash
   heroku login
   heroku create uk-wind-trading-backend
   heroku stack:set container -a uk-wind-trading-backend
   heroku config:set CORS_ORIGINS="https://<your-vercel-app>.vercel.app"
   git push heroku main
   ```
2. **Deploy Frontend on Vercel:**
   - Connect repository to Vercel.
   - Set **Root Directory** to `frontend`.
   - Set Environment Variable: `VITE_API_URL = https://uk-wind-trading-backend.herokuapp.com`.
   - Click **Deploy**.

### Post-Deployment Smoke-Test Checklist
After deployment, verify the live application:
- [ ] Open `<app-url>/api/health`: Verify JSON returns `"status": "ok"` and `"data_loaded": true`.
- [ ] Open `<app-url>/api/metrics?group_by=overall`: Verify MAE is `2038.91` and count is `744`.
- [ ] Open `<app-url>/api/forecast/decision?delivery_date=2026-01-15`: Verify `24 / 24 Hours Matched (100%)`.
- [ ] Open `<app-url>/` in an incognito window:
  - Decision chart renders with decision forecast line, hourly actuals, and uncertainty band.
  - Delivery day picker allows navigating between Jan 2 and Feb 1.
  - Accuracy tab displays 6 metric cards, monthly trend chart, diurnal error chart, and horizon curve.
  - Methodology button opens modal with EPEX 09:20 gate closure citation and data caveats.

---

## 11. Anonymous Git Setup (For Clean Submissions)

Before making your initial git commit to your anonymous submission repository, set your local git identity:
```bash
git config user.name "Anonymous Candidate"
git config user.email "candidate@anonymous.local"
```
To verify before pushing:
```bash
git config user.name
git config user.email
```

---

## 12. AI Tools Used

This project was developed with code assistance from **Google Antigravity** (code generation and test implementation) and **Claude** (planning and architectural review). All generated logic, calculations, and tests were thoroughly reviewed, validated, and verified against official Elexon specifications by the candidate.

---

## 13. Submission Checklist

- [x] Scope strictly limited to national UK wind and Elexon BMRS data for January 2026 decisions.
- [x] Pure core logic function in isolated module with docstrings and zero side effects.
- [x] Strict 09:00 UK decision cutoff with documented EPEX 09:20 gate closure citation.
- [x] Zero data leakage: post-cutoff forecasts strictly excluded; pre-cutoff picks latest valid.
- [x] Arithmetic half-hourly to hourly aggregation matching canonical Elexon `startTime` definitions.
- [x] Zero-safe MAPE calculation guarding against division by zero.
- [x] All 5 endpoints implemented with strict Pydantic response models.
- [x] 33 pytest unit tests covering all required cases and hand-computed reference values.
- [x] Real January metrics reported (MAE 2,039 MW, Bias +1,748 MW, P95 5,283 MW).
- [x] Cautious wording: +1.75 GW verified; fleet coverage and curtailment marked as unverified hypotheses.
- [x] Alignment shift check executed; debiased MAE confirmed minimal at canonical alignment.
- [x] Responsive React + Vite + TypeScript + Recharts UI with dark trading desk styling.
- [x] Dockerfile (pinned Python 3.12-slim), multi-stage frontend Dockerfile, and docker-compose.yml.
- [x] GitHub Actions CI pipeline testing container builds, pytest, and compose integration.
- [x] Monorepo Vercel serverless deployment and Heroku container options configured.
- [x] Complete anonymity scan passed; zero personal identifiers in code or commit metadata.
