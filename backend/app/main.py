"""Local FastAPI API for match history and the explainable fleet-profile prior."""

from __future__ import annotations

import csv
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "model" / "data"
MATCHES = DATA_DIR / "matches.csv"
FLEETS = DATA_DIR / "player_fleet_layouts.csv"
EVENTS = DATA_DIR / "adaptive_ai_learning_log.csv"
LOCK = threading.Lock()
FLEET = {"carrier": 5, "battleship": 4, "cruiser": 3, "submarine": 3, "destroyer": 2}
EVENT_COLUMNS = ["timestamp", "event_type", "match_id", "difficulty", "strategy", "modelStatus", "profileLayoutCount", "profileWeight", "syntheticModelWeight", "shotsObserved", "remainingShipLengths", "targetRow", "targetCol", "targetCoordinate", "outcome", "candidateRanks", "explanation", "training_source", "fleet_cells_learned", "update_applied"]
MATCH_COLUMNS = ["match_id", "started_at", "completed_at", "difficulty", "result", "turns", "hit_rate", "duration_seconds", "player_shots", "ai_shot_count"]
FLEET_COLUMNS = ["match_id", "completed_at", "difficulty", "result", "ship_id", "ship_name", "length", "orientation", "cells"]

app = FastAPI(title="Adaptive AI Battleship API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["GET", "POST"], allow_headers=["*"])


@app.on_event("startup")
def initialize_project_logs() -> None:
    """Create visible, header-only CSVs before the first completed match."""
    for path, columns in ((MATCHES, MATCH_COLUMNS), (FLEETS, FLEET_COLUMNS), (EVENTS, EVENT_COLUMNS)):
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w", newline="", encoding="utf-8") as handle:
                csv.writer(handle).writerow(columns)


class Cell(BaseModel):
    row: int = Field(ge=0, le=9)
    col: int = Field(ge=0, le=9)


class Ship(BaseModel):
    id: str
    name: str
    length: int = Field(ge=2, le=5)
    orientation: str = "unknown"
    cells: list[Cell]


class Shot(BaseModel):
    cell: Cell
    result: str


class Candidate(BaseModel):
    cell: Cell
    score: float
    relativeScore: float | None = None


class ObservableState(BaseModel):
    boardSize: int = 10
    shotsTaken: list[Cell]
    shotResults: list[Shot]
    remainingShipLengths: list[int]
    knownSunkShipLengths: list[int]


class ScoreRequest(BaseModel):
    state: ObservableState
    candidates: list[Candidate]


class AIDecision(BaseModel):
    eventType: str = "ai_shot"
    timestamp: str | None = None
    difficulty: str
    strategy: str
    modelStatus: str
    profileLayoutCount: int = 0
    profileWeight: float = 0
    syntheticModelWeight: float = 0
    shotsObserved: int = 0
    remainingShipLengths: list[int] = []
    targetRow: int
    targetCol: int
    targetCoordinate: str
    outcome: str
    candidateRanks: list[dict[str, Any]] = []
    explanation: str = ""


class CompletedMatch(BaseModel):
    matchId: str
    difficulty: str
    won: bool
    turns: int
    hitRate: float
    durationSeconds: int
    startedAt: str | None = None
    completedAt: str | None = None
    fleet: list[Ship]
    playerShots: list[Shot]
    aiDecisions: list[AIDecision] = []


def _read(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _append(path: Path, row: dict[str, Any], columns: list[str]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    needs_header = not path.exists() or path.stat().st_size == 0
    with path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        if needs_header:
            writer.writeheader()
        writer.writerow({key: json.dumps(value, separators=(",", ":")) if isinstance(value, (dict, list)) else value for key, value in row.items()})


def _validated_fleet(fleet: list[Ship]) -> None:
    if len(fleet) != 5 or {ship.id: ship.length for ship in fleet} != FLEET:
        raise HTTPException(422, "Fleet must contain the standard five ship ids and lengths.")
    occupied: set[tuple[int, int]] = set()
    for ship in fleet:
        if len(ship.cells) != ship.length:
            raise HTTPException(422, f"{ship.name} must contain {ship.length} cells.")
        coords = [(cell.row, cell.col) for cell in ship.cells]
        if len(set(coords)) != ship.length or any(cell in occupied for cell in coords):
            raise HTTPException(422, "Fleet cells must be unique and non-overlapping.")
        rows, cols = {r for r, _ in coords}, {c for _, c in coords}
        if len(rows) == 1 and len(cols) == ship.length:
            ordered = sorted(cols)
        elif len(cols) == 1 and len(rows) == ship.length:
            ordered = sorted(rows)
        else:
            raise HTTPException(422, f"{ship.name} must occupy consecutive cells in one direction.")
        if ordered != list(range(ordered[0], ordered[0] + ship.length)):
            raise HTTPException(422, f"{ship.name} must occupy consecutive cells in one direction.")
        occupied.update(coords)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "adaptive-battleship-local", "dataDirectory": str(DATA_DIR)}


@app.post("/api/matches")
def save_match(match: CompletedMatch) -> dict[str, Any]:
    _validated_fleet(match.fleet)
    player_coords = [(shot.cell.row, shot.cell.col) for shot in match.playerShots]
    ai_coords = [(decision.targetRow, decision.targetCol) for decision in match.aiDecisions]
    if len(player_coords) != len(set(player_coords)) or len(ai_coords) != len(set(ai_coords)):
        raise HTTPException(422, "A match cannot contain repeated shots.")
    if any(shot.result not in {"hit", "miss", "sunk"} for shot in match.playerShots):
        raise HTTPException(422, "Player shot result must be hit, miss, or sunk.")
    ids = {row["match_id"] for row in _read(MATCHES)}
    if match.matchId in ids:
        return {"saved": True, "duplicate": True, "matchId": match.matchId}
    now = datetime.now(timezone.utc).isoformat()
    with LOCK:
        _append(MATCHES, {"match_id": match.matchId, "started_at": match.startedAt or "", "completed_at": match.completedAt or now, "difficulty": match.difficulty, "result": "victory" if match.won else "defeat", "turns": match.turns, "hit_rate": match.hitRate, "duration_seconds": match.durationSeconds, "player_shots": [shot.model_dump() for shot in match.playerShots], "ai_shot_count": len(match.aiDecisions)}, MATCH_COLUMNS)
        for ship in match.fleet:
            _append(FLEETS, {"match_id": match.matchId, "completed_at": match.completedAt or now, "difficulty": match.difficulty, "result": "victory" if match.won else "defeat", "ship_id": ship.id, "ship_name": ship.name, "length": ship.length, "orientation": ship.orientation, "cells": [cell.model_dump() for cell in ship.cells]}, FLEET_COLUMNS)
        for decision in match.aiDecisions:
            _append(EVENTS, {"timestamp": decision.timestamp or now, "event_type": "ai_shot", "match_id": match.matchId, **decision.model_dump(exclude={"timestamp", "eventType"})}, EVENT_COLUMNS)
        _append(EVENTS, {"timestamp": now, "event_type": "fleet_profile_update", "match_id": match.matchId, "difficulty": match.difficulty, "training_source": "completed player-deployed fleet layout", "fleet_cells_learned": 17, "update_applied": True}, EVENT_COLUMNS)
    return {"saved": True, "duplicate": False, "matchId": match.matchId, "aiDecisionsSaved": len(match.aiDecisions)}


@app.get("/api/matches/recent")
def recent_matches(limit: int = Query(30, ge=1, le=200)) -> list[dict[str, Any]]:
    rows = _read(MATCHES)[-limit:][::-1]
    for row in rows:
        row["player_shots"] = json.loads(row.get("player_shots") or "[]")
    return rows


@app.get("/api/matches/{match_id}")
def match_detail(match_id: str) -> dict[str, Any]:
    match = next((row for row in _read(MATCHES) if row["match_id"] == match_id), None)
    if not match:
        raise HTTPException(404, "Match not found")
    match["player_shots"] = json.loads(match.get("player_shots") or "[]")
    fleet = [row for row in _read(FLEETS) if row["match_id"] == match_id]
    for ship in fleet:
        ship["cells"] = json.loads(ship["cells"])
    events = [row for row in _read(EVENTS) if row.get("match_id") == match_id]
    return {"match": match, "fleet": fleet, "aiEvents": events}


def _profile() -> dict[str, Any]:
    rows = _read(FLEETS)
    layouts: dict[str, set[tuple[int, int]]] = {}
    for row in rows:
        if row.get("match_id"):
            layouts.setdefault(row["match_id"], set()).update((cell["row"], cell["col"]) for cell in json.loads(row["cells"]))
    counts = [[0 for _ in range(10)] for _ in range(10)]
    for cells in layouts.values():
        for r, c in cells:
            counts[r][c] += 1
    n = len(layouts)
    weight = 0.25 * n / (n + 12) if n >= 2 else 0
    ranking = sorted(({"row": r, "col": c, "coordinate": f"{chr(65+c)}{r+1}", "layouts": counts[r][c], "score": round((counts[r][c] + 0.68) / (n + 4), 5)} for r in range(10) for c in range(10)), key=lambda x: (-x["score"], x["row"], x["col"]))
    return {"layoutCount": n, "profileWeight": weight, "syntheticModelWeight": 0, "topCells": ranking[:15], "occupancyCounts": counts, "method": "Smoothed empirical occupancy from completed player-deployed fleets; player shot coordinates are not training evidence.", "syntheticModelNote": "Offline synthetic MLP selected zero full-game blend weight and is not used for gameplay ranking."}


@app.get("/api/model/profile")
def model_profile() -> dict[str, Any]:
    return _profile()


@app.post("/api/model/score")
def score_candidates(request: ScoreRequest) -> dict[str, Any]:
    # No hidden layout accepted here. Candidate legality is supplied by the frontend's PDM.
    state = request.state
    shot_set = {(cell.row, cell.col) for cell in state.shotsTaken}
    candidates = [candidate for candidate in request.candidates if (candidate.cell.row, candidate.cell.col) not in shot_set]
    if not candidates:
        raise HTTPException(422, "No legal unshot candidates supplied.")
    profile = _profile()
    n, weight = profile["layoutCount"], profile["profileWeight"]
    counts = profile["occupancyCounts"]
    prior = 17 / 100
    profile_scores = [(counts[c.cell.row][c.cell.col] + 4 * prior) / (n + 4) for c in candidates]
    rule_total = sum(max(0, c.score) for c in candidates) or 1
    profile_total = sum(profile_scores) or 1
    ranked = []
    for candidate, pscore in zip(candidates, profile_scores):
        score = (1 - weight) * max(0, candidate.score) / rule_total + weight * pscore / profile_total
        ranked.append({"cell": candidate.cell.model_dump(), "score": score, "relativeScore": 0, "ruleScore": candidate.score, "profileScore": pscore})
    max_score = max(item["score"] for item in ranked) or 1
    for item in ranked:
        item["relativeScore"] = round(100 * item["score"] / max_score)
    ranked.sort(key=lambda item: (-item["score"], item["cell"]["row"], item["cell"]["col"]))
    return {"candidates": ranked, "strategy": "PDM + backend player fleet profile" if n >= 2 else "PDM (backend profile collecting data)", "modelStatus": "backend_profile" if n >= 2 else "rule_based", "profileLayoutCount": n, "profileWeight": weight, "syntheticModelWeight": 0, "explanation": f"Rule-based legal placement scores are blended with an empirical occupancy profile from {n} completed layouts. Synthetic MLP weight is 0."}


@app.get("/api/logs/{name}")
def download_log(name: str) -> FileResponse:
    allowed = {"matches.csv": MATCHES, "player_fleet_layouts.csv": FLEETS, "adaptive_ai_learning_log.csv": EVENTS}
    if name not in allowed:
        raise HTTPException(404, "Unknown log")
    path = allowed[name]
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("", encoding="utf-8")
    return FileResponse(path, media_type="text/csv", filename=name)
