"""Generate reproducible, clearly labeled Battleship simulation records.

This is an offline demonstration tool. Its synthetic player layouts are kept
separate from real match CSVs and must not be presented as human-play data or
as an evaluation benchmark.

Run from the project root:
    python backend/simulate_games.py --games 10 --seed 20261028
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "model" / "data" / "simulation"
FLEET = [("carrier", "Carrier", 5), ("battleship", "Battleship", 4),
         ("cruiser", "Cruiser", 3), ("submarine", "Submarine", 3),
         ("destroyer", "Destroyer", 2)]
SIZE = 10


def placements(length: int) -> list[tuple[tuple[int, int], ...]]:
    result = []
    for row in range(SIZE):
        for col in range(SIZE - length + 1):
            result.append(tuple((row, col + i) for i in range(length)))
    for row in range(SIZE - length + 1):
        for col in range(SIZE):
            result.append(tuple((row + i, col) for i in range(length)))
    return result


def style_weight(cells: tuple[tuple[int, int], ...], style: str) -> float:
    rows = [cell[0] for cell in cells]
    cols = [cell[1] for cell in cells]
    if style == "left-biased":
        return 0.15 + 2.0 / (1 + sum(cols) / len(cols))
    if style == "edge-biased":
        edge = sum(min(r, c, 9 - r, 9 - c) for r, c in cells) / len(cells)
        return 0.2 + 2.0 / (1 + edge)
    if style == "center-biased":
        distance = sum(abs(r - 4.5) + abs(c - 4.5) for r, c in cells) / len(cells)
        return 0.2 + distance / 10
    return 1.0


def generate_fleet(rng: random.Random, style: str = "random") -> list[dict[str, Any]]:
    """Place the standard fleet; adjacency is allowed, overlap is not."""
    for _ in range(500):
        fleet = []
        occupied: set[tuple[int, int]] = set()
        for ship_id, name, length in FLEET:
            options = [cells for cells in placements(length) if not occupied.intersection(cells)]
            weights = [style_weight(cells, style) for cells in options]
            chosen = rng.choices(options, weights=weights, k=1)[0]
            occupied.update(chosen)
            fleet.append({"id": ship_id, "name": name, "length": length, "cells": chosen})
        if len(occupied) == 17:
            return fleet
    raise RuntimeError("Unable to place a legal fleet after repeated attempts")


def occupancy_profile(layouts: list[list[dict[str, Any]]]) -> Counter[tuple[int, int]]:
    counts: Counter[tuple[int, int]] = Counter()
    for fleet in layouts:
        for ship in fleet:
            counts.update(ship["cells"])
    return counts


def candidate_scores(shots: list[dict[str, Any]], remaining: list[int],
                     profile_layouts: list[list[dict[str, Any]]], adaptive: bool
                     ) -> tuple[list[dict[str, Any]], float, int, str]:
    shot_cells = {tuple(shot["cell"]) for shot in shots}
    misses = {tuple(shot["cell"]) for shot in shots if shot["result"] == "miss"}
    sunk = {tuple(shot["cell"]) for shot in shots if shot["result"] == "sunk"}
    hits = {tuple(shot["cell"]) for shot in shots if shot["result"] == "hit"}
    target_mode = bool(hits)
    min_length = min(remaining) if remaining else 2
    heat: Counter[tuple[int, int]] = Counter()

    # Mirrors the project's PDM: legal straight placements are constrained by
    # observed misses/sunk cells and weighted to explain unresolved hits.
    for length in remaining or [2]:
        for placement in placements(length):
            if any(cell in misses or cell in sunk for cell in placement):
                continue
            covered = sum(cell in hits for cell in placement)
            weight = (0.05 if covered == 0 else 15 ** covered) if target_mode else 1.0
            for cell in placement:
                if cell not in shot_cells:
                    heat[cell] += weight

    if not target_mode and min_length >= 2:
        for cell in list(heat):
            if sum(cell) % min_length != 0:
                heat[cell] *= 0.15

    candidates = [{"cell": cell, "score": heat[cell]} for cell in heat if cell not in shot_cells]
    if not candidates:
        candidates = [{"cell": (r, c), "score": 0.0}
                      for r in range(SIZE) for c in range(SIZE) if (r, c) not in shot_cells]
    candidates.sort(key=lambda item: (-item["score"], item["cell"][0], item["cell"][1]))

    layout_count = len(profile_layouts)
    profile_weight = 0.25 * layout_count / (layout_count + 12) if adaptive and layout_count >= 2 else 0.0
    strategy = "Adaptive PDM + synthetic layout profile" if profile_weight else "Rule-based PDM"
    if profile_weight:
        counts = occupancy_profile(profile_layouts)
        profile_scores = [(counts[item["cell"]] + 0.68) / (layout_count + 4) for item in candidates]
        rule_total = sum(max(0, item["score"]) for item in candidates) or 1.0
        profile_total = sum(profile_scores) or 1.0
        for item, prior in zip(candidates, profile_scores):
            item["rule_score"] = item["score"]
            item["profile_score"] = prior
            item["score"] = ((1 - profile_weight) * max(0, item["rule_score"]) / rule_total
                             + profile_weight * prior / profile_total)
        candidates.sort(key=lambda item: (-item["score"], item["cell"][0], item["cell"][1]))
    top = candidates[0]["score"]
    top_group = [item for item in candidates if item["score"] >= top * 0.95]
    # Return scores; caller selects reproducibly from near-tied top PDM moves.
    candidates = [{**item, "relative_score": round(100 * item["score"] / top) if top else 0}
                  for item in candidates]
    return candidates, profile_weight, layout_count, strategy


def fire(board: dict[str, Any], fleet: list[dict[str, Any]], cell: tuple[int, int],
         shots: list[dict[str, Any]]) -> dict[str, Any]:
    ship = next((ship for ship in fleet if cell in ship["cells"]), None)
    if ship is None:
        result = "miss"
    else:
        board[ship["id"]].add(cell)
        result = "sunk" if len(board[ship["id"]]) == ship["length"] else "hit"
        if result == "sunk":
            for previous in shots:
                if tuple(previous["cell"]) in ship["cells"]:
                    previous["result"] = "sunk"
    record = {"cell": cell, "result": result, "ship_id": ship["id"] if ship else ""}
    shots.append(record)
    return record


def simulate_match(rng: random.Random, match_id: str, layouts: list[list[dict[str, Any]]],
                   style: str, adaptive: bool) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    player_fleet = generate_fleet(rng, style)
    enemy_fleet = generate_fleet(rng, "random")
    player_board = {ship["id"]: set() for ship in player_fleet}
    enemy_board = {ship["id"]: set() for ship in enemy_fleet}
    player_shots: list[dict[str, Any]] = []
    ai_shots: list[dict[str, Any]] = []
    moves: list[dict[str, Any]] = []
    ai_logs: list[dict[str, Any]] = []
    start = datetime.now(timezone.utc).isoformat()
    game_over = False
    player_won = False
    decision_number = 0

    def all_sunk(board: dict[str, set[tuple[int, int]]], fleet: list[dict[str, Any]]) -> bool:
        return all(len(board[ship["id"]]) == ship["length"] for ship in fleet)

    # Each side retains the turn after hits/sinks and passes after a miss.
    side = "player"
    while not game_over:
        if side == "player":
            available = [(r, c) for r in range(SIZE) for c in range(SIZE)
                         if (r, c) not in {tuple(shot["cell"]) for shot in player_shots}]
            cell = rng.choice(available)
            shot = fire(enemy_board, enemy_fleet, cell, player_shots)
            moves.append({"match_id": match_id, "move_number": len(moves) + 1,
                          "side": "simulated_player", "coordinate": f"{chr(65 + cell[1])}{cell[0] + 1}",
                          "row": cell[0], "col": cell[1], "outcome": shot["result"], "strategy": "uniform random legal shot"})
            if all_sunk(enemy_board, enemy_fleet):
                player_won, game_over = True, True
            elif shot["result"] == "miss":
                side = "ai"
        else:
            decision_number += 1
            remaining = [ship["length"] for ship in player_fleet
                         if len(player_board[ship["id"]]) < ship["length"]]
            candidates, weight, layout_count, strategy = candidate_scores(ai_shots, remaining, layouts, adaptive)
            top_score = candidates[0]["score"] if candidates else 0
            near_top = [candidate for candidate in candidates if candidate["score"] >= top_score * 0.95]
            choice = rng.choice(near_top) if near_top else candidates[0]
            cell = tuple(choice["cell"])
            observed = [{"row": shot["cell"][0], "col": shot["cell"][1], "result": shot["result"]}
                        for shot in ai_shots]
            shot = fire(player_board, player_fleet, cell, ai_shots)
            coord = f"{chr(65 + cell[1])}{cell[0] + 1}"
            explanation = ("Blends legal-placement PDM scores with prior completed synthetic layouts."
                           if weight else "Ranks legal unshot cells from current misses, hits, sunk ships, and parity.")
            decision = {"match_id": match_id, "decision_number": decision_number,
                        "shots_observed": len(observed), "target_coordinate": coord,
                        "target_row": cell[0], "target_col": cell[1], "outcome": shot["result"],
                        "strategy": strategy, "profile_layout_count": layout_count,
                        "profile_weight": round(weight, 6), "remaining_ship_lengths": json.dumps(remaining),
                        "observable_shots": json.dumps(observed, separators=(",", ":")),
                        "candidate_ranks": json.dumps([{"coordinate": f"{chr(65+c['cell'][1])}{c['cell'][0]+1}",
                                                        "relative_score": c["relative_score"]}
                                                       for c in candidates[:10]], separators=(",", ":")),
                        "explanation": explanation}
            ai_logs.append(decision)
            moves.append({"match_id": match_id, "move_number": len(moves) + 1,
                          "side": "simulated_ai", "coordinate": coord, "row": cell[0], "col": cell[1],
                          "outcome": shot["result"], "strategy": strategy})
            if all_sunk(player_board, player_fleet):
                player_won, game_over = False, True
            elif shot["result"] == "miss":
                side = "player"

    hit_shots = sum(shot["result"] in {"hit", "sunk"} for shot in player_shots)
    summary = {"match_id": match_id, "data_source": "synthetic_simulation",
               "player_placement_style": style, "result": "victory" if player_won else "defeat",
               "ai_strategy": "adaptive" if adaptive else "strategist",
               "total_moves": len(moves), "player_shots": len(player_shots),
               "player_hit_rate": round(hit_shots / max(1, len(player_shots)), 4),
               "ai_shots": len(ai_shots), "ai_profile_layouts_available": max(0, len(layouts)),
               "ai_profile_weight_max": max((float(item["profile_weight"]) for item in ai_logs), default=0),
               "simulated_at": datetime.now(timezone.utc).isoformat(), "started_at": start}
    fleet_rows = [{"match_id": match_id, "data_source": "synthetic_simulation",
                   "ship_id": ship["id"], "ship_name": ship["name"], "length": ship["length"],
                   "cells": json.dumps([{"row": r, "col": c} for r, c in ship["cells"]], separators=(",", ":"))}
                  for ship in player_fleet]
    return summary, fleet_rows, moves, ai_logs, player_fleet


def append_csv(path: Path, rows: list[dict[str, Any]], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    needs_header = not path.exists() or path.stat().st_size == 0
    with path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        if needs_header:
            writer.writeheader()
        writer.writerows(rows)


def load_prior_layouts(path: Path) -> list[list[dict[str, Any]]]:
    if not path.exists():
        return []
    by_match: dict[str, list[dict[str, Any]]] = {}
    with path.open("r", newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row.get("data_source") != "synthetic_simulation":
                continue
            cells = json.loads(row["cells"])
            by_match.setdefault(row["match_id"], []).append({
                "id": row["ship_id"], "name": row["ship_name"], "length": int(row["length"]),
                "cells": tuple((cell["row"], cell["col"]) for cell in cells),
            })
    return list(by_match.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate complete Battleship games and write demo-only CSV logs.")
    parser.add_argument("--games", type=int, default=10, help="Number of games to append (default: 10).")
    parser.add_argument("--seed", type=int, default=20261028, help="Reproducible random seed.")
    parser.add_argument("--layout-style", choices=["random", "left-biased", "edge-biased", "center-biased"],
                        default="left-biased", help="Synthetic player's repeated fleet placement style.")
    parser.add_argument("--strategy", choices=["adaptive", "strategist"], default="adaptive")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Output directory (default: {DEFAULT_OUTPUT}).")
    args = parser.parse_args()
    if args.games < 1 or args.games > 10000:
        parser.error("--games must be between 1 and 10000")

    rng = random.Random(args.seed)
    output = args.output_dir.resolve()
    fleet_path = output / "simulated_fleets.csv"
    layouts = load_prior_layouts(fleet_path)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    all_summaries, all_fleets, all_moves, all_ai = [], [], [], []
    for index in range(1, args.games + 1):
        match_id = f"sim_{run_id}_{index:04d}"
        summary, fleet_rows, moves, decisions, player_fleet = simulate_match(
            rng, match_id, layouts, args.layout_style, args.strategy == "adaptive")
        summary["run_id"] = run_id
        all_summaries.append(summary)
        all_fleets.extend(fleet_rows)
        all_moves.extend(moves)
        all_ai.extend(decisions)
        # Only completed earlier synthetic layouts inform this simulated run's
        # later games; never write them into the real backend profile.
        layouts.append(player_fleet)

    append_csv(output / "simulated_matches.csv", all_summaries,
               ["run_id", "match_id", "data_source", "player_placement_style", "result", "ai_strategy",
                "total_moves", "player_shots", "player_hit_rate", "ai_shots", "ai_profile_layouts_available",
                "ai_profile_weight_max", "started_at", "simulated_at"])
    append_csv(fleet_path, all_fleets,
               ["match_id", "data_source", "ship_id", "ship_name", "length", "cells"])
    append_csv(output / "simulated_moves.csv", all_moves,
               ["match_id", "move_number", "side", "coordinate", "row", "col", "outcome", "strategy"])
    append_csv(output / "simulated_ai_decisions.csv", all_ai,
               ["match_id", "decision_number", "shots_observed", "target_coordinate", "target_row", "target_col",
                "outcome", "strategy", "profile_layout_count", "profile_weight", "remaining_ship_lengths",
                "observable_shots", "candidate_ranks", "explanation"])

    print(f"Created {args.games} complete synthetic games (seed={args.seed}, run_id={run_id}).")
    print(f"CSV output: {output}")
    print("These are simulated examples, not human match records or a measured policy evaluation.")
    for match in all_summaries:
        print(f"{match['match_id']}: {match['result']} · {match['total_moves']} total moves · "
              f"{match['ai_shots']} AI shots · profile layouts available={match['ai_profile_layouts_available']}")


if __name__ == "__main__":
    main()
