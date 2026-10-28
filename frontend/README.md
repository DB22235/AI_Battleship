# Adaptive AI Battleship — React Tactical Command Center

A high-fidelity, explainable Battleship strategy web application built in **React 18** with **JSX**, backed by a local FastAPI service for match history and fleet-profile learning.

---

## React Architecture (`frontend/src/`)

```text
frontend/
├── index.html                   # HTML entry point (React 18 & Babel standalone / Vite ready)
├── package.json                 # Standard React + Vite project manifest
├── vite.config.js               # Vite bundler configuration
├── css/
│   ├── design-tokens.css        # Tactical dark-navy palette & spacing
│   ├── base.css                 # Typography & layout shells
│   ├── components.css           # Buttons, cards, badges, tabs, dialogs
│   └── boards.css               # 10×10 grids, dual-encoded cell states
└── src/
    ├── main.jsx                 # React DOM root render
    ├── App.jsx                  # Main React SPA Controller & State Machine
    ├── types/
    │   └── constants.js         # Fleet config, coordinate utilities (A1-J10 <-> [0,9])
    ├── api/
    │   └── backend-client.js    # Local FastAPI client used by gameplay and research views
    ├── storage/
    │   └── storage.js           # Browser-local preferences/progression and offline fallback
    ├── engine/
    │   ├── rules.js             # Collision checks, bounds validator, legal randomizer
    │   ├── board.js             # Board matrix model, hit/miss/sunk logic
    │   └── game.js              # Turn coordinator, pause/resume, match lifecycle
    ├── ai/
    │   ├── observable.js        # Leakage-safe ObservableAIState builder
    │   ├── pdm-solver.js        # Probability Density Matrix constraint solver
    │   ├── policies.js          # 4 Difficulty policies (Recruit, Strategist, Adaptive, Commander)
    │   └── player-predictor.js  # Independent player next-shot prediction
    ├── components/
    │   ├── Header.jsx           # Tactical navbar, brand mark, settings toggle
    │   ├── Board.jsx            # 10×10 Battleship grid component with dual-encoding
    │   ├── AIAnalysisPanel.jsx  # Tabbed AI Intelligence Hub (AI targeting vs Player prediction)
    │   └── SettingsModal.jsx    # Tactical preferences & local storage reset dialog
    └── views/
        ├── CommandCenter.jsx    # Hero, level progress, system integrity, match records
        ├── DifficultySelection.jsx # 4 difficulty cards with "What changes at this level?"
        ├── FleetDeployment.jsx  # Interactive placement, H/V toggle (R key), randomizer
        ├── GameplayArena.jsx    # Dual-board battle arena, fire controls, turn alerts
        ├── Results.jsx          # Victory/Defeat breakdown, statistics, unlocks
        ├── LearningLab.jsx      # 4-stage research pipeline, strategy cards, demo sample records
        └── MatchHistory.jsx     # Filterable match history table & win rate analytics
```

---

## How to Run (Local Frontend + FastAPI)

From the project root, install and run the local API in one terminal:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8001
```

In a second terminal, start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` requests to `http://127.0.0.1:8001`. FastAPI creates `model/data/` and appends `matches.csv`, `player_fleet_layouts.csv`, and `adaptive_ai_learning_log.csv`. Open **Learning Lab** to inspect profile counts and download the project logs; open **Match History → Moves & learning** to inspect a match's moves and AI decisions.
