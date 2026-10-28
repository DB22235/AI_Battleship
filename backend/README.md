# Local FastAPI backend

The API runs locally and writes research/demo records into `model/data/` in the project. It has no account, hosted service, or remote database.

From the project root:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8001
```

Run this command from the project root. If your terminal is already in the `backend` folder, use `python -m uvicorn app.main:app --reload --port 8001` instead.

Run the frontend separately:

```powershell
cd frontend
npm install
npm run dev
```

Vite proxies `/api` calls to port 8001. Interactive API docs are available at `http://127.0.0.1:8001/docs`.

## Data and learning

- `GET /api/health` reports whether the backend is reachable.
- `POST /api/model/score` ranks legal candidate cells using the supplied PDM scores and a smoothed profile of completed player fleets. The request contains observable shots only; current hidden fleet cells are not sent.
- `GET /api/model/profile` returns the learned cell-frequency summary and active profile weight.
- `POST /api/matches` stores a completed match, player shots, AI decisions, and the player's deployed fleet. The fleet is accepted only at match completion and is used as training history for later matches.
- `/api/matches/recent`, `/api/matches/{match_id}`, and `/api/logs/{filename}` serve history and CSV downloads.

CSV files append under `model/data/`: `matches.csv`, `player_fleet_layouts.csv`, and `adaptive_ai_learning_log.csv`. The API validates standard fleet shape and ignores duplicate match IDs. The empirical personal profile is a heuristic prior, not a separately validated improvement claim. The synthetic MLP's evaluated full-game weight is zero and it is not used for gameplay ranking.

## Generate classroom demonstration games

The standalone simulator needs only Python's standard library and does not need the backend running:

```powershell
python backend/simulate_games.py --games 10 --seed 20261028
```

It writes separate, explicitly synthetic logs under `model/data/simulation/`: `simulated_matches.csv`, `simulated_moves.csv`, `simulated_fleets.csv`, and `simulated_ai_decisions.csv`. Its repeated left-biased synthetic fleet style lets later simulated games show how the empirical profile weight accumulates. These are demonstration runs, not actual human games or a measured performance evaluation; they do not enter the backend's real player profile.
