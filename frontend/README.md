# Adaptive AI Battleship — React Tactical Command Center

A high-fidelity, explainable Battleship strategy web application built entirely in **React 18** with **JSX**, modular component hierarchy, custom hooks, and zero backend dependencies.

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
    ├── storage/
    │   └── storage.js           # Browser-local persistence ("Stored in this browser")
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

## How to Run

### Option 1: Zero-Setup Direct Browser Execution
Open `frontend/index.html` directly in any browser (or launch via VS Code Live Server). The application uses modern browser-native ES module import maps and Babel standalone to execute JSX on the fly with **zero npm commands or build steps required**.

### Option 2: Standard Vite Tooling
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:3000`.
