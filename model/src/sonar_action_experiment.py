"""Offline contextual action-value experiment for Battleship Sonar Scan."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from occupancy_experiment import FLEET, density_candidates, generate_fleet


SIMULATOR_VERSION = "react-rules-sonar-v1"
ACTION_POLICY_VERSION = "sonar-tabular-q-v1"
PLACEMENT_STYLES = ("random", "edge", "center")
EVAL_STYLES = ("random", "edge", "center", "corner")
MIN_VISITS = 5


def legal_shots(shots):
    return [(r, c) for r in range(10) for c in range(10) if (r, c) not in shots]


def scan_unshot_count(hidden_cells, shots, center):
    row, col = center
    if not (1 <= row <= 8 and 1 <= col <= 8):
        raise ValueError("Sonar center must keep the full 3×3 region in bounds")
    return sum((r, c) in hidden_cells and (r, c) not in shots
               for r in range(row - 1, row + 2) for c in range(col - 1, col + 2))


def scan_region(candidates):
    """Maximize region mass in normalized relative PDM score, stable row-major ties."""
    score_by_cell = {item["cell"]: max(0.0, float(item["score"])) for item in candidates}
    total = sum(score_by_cell.values())
    if total <= 0:
        return None
    best = None
    for row in range(1, 9):
        for col in range(1, 9):
            mass = sum(score_by_cell.get((r, c), 0.0)
                       for r in range(row - 1, row + 2) for c in range(col - 1, col + 2))
            if best is None or mass > best["score"]:
                best = {"center": (row, col), "score": mass}
    return {**best, "score_share": best["score"] / total}


def observable_features(shots, outcomes, remaining_lengths, candidates, scans):
    """Compact tabular context derived only from policy-observable information."""
    scores = np.asarray([max(0.0, float(item["score"])) for item in candidates], dtype=float)
    total = float(scores.sum())
    shares = scores / total if total > 0 else np.full(len(scores), 1 / max(1, len(scores)))
    positive = shares[shares > 0]
    entropy = float(-np.sum(positive * np.log(positive)) / np.log(max(2, len(shares)))) if len(positive) else 0.0
    entropy = max(0.0, min(1.0, entropy))
    region = scan_region(candidates)
    region_share = region["score_share"] if region else 0.0
    hit_active = any(result == "hit" for result in outcomes.values())
    shots_bucket = 0 if len(shots) < 3 else 1 if len(shots) < 15 else 2
    remaining_ships_bucket = int(len(remaining_lengths) <= 2)
    entropy_bucket = int(entropy >= .82)
    region_bucket = 0 if region_share < .15 else 1 if region_share < .25 else 2
    key = "|".join(map(str, (shots_bucket, int(hit_active), remaining_ships_bucket,
                              entropy_bucket, region_bucket)))
    return {
        "key": key,
        "features": {
            "shotsBucket": shots_bucket,
            "activeUnsunkHit": bool(hit_active),
            "fewRemainingShips": bool(remaining_ships_bucket),
            "relativeScoreEntropy": round(entropy, 6),
            "bestRegionRelativeScoreShare": round(region_share, 6),
            "relativeScoreEntropyBucket": entropy_bucket,
            "regionScoreShareBucket": region_bucket,
            "observableScanCount": len(scans),
        },
        "region": region,
    }


def fixed_scan_rule(state_features, shots, outcomes, charge, region):
    return bool(charge and len(shots) >= 3 and
                not any(result == "hit" for result in outcomes.values()) and
                region and region["score_share"] >= .20)


def create_table():
    return {}


def record_cost(table, key, action, remaining_actions):
    state = table.setdefault(key, {})
    item = state.setdefault(action, {"visits": 0, "meanRemainingActions": 0.0})
    item["visits"] += 1
    item["meanRemainingActions"] += (remaining_actions - item["meanRemainingActions"]) / item["visits"]


def choose_action(mode, context, state, shots, outcomes, charge, table, rng, epsilon=0.0):
    region = context["region"]
    if not charge or region is None:
        return "shot"
    if mode == "pdm":
        return "shot"
    if mode == "fixed":
        return "scan" if fixed_scan_rule(context["features"], shots, outcomes, charge, region) else "shot"
    if mode == "random":
        return "shot"
    if mode == "train" and rng.random() < epsilon:
        return "scan" if rng.random() < .5 else "shot"
    values = table.get(context["key"], {})
    fire = values.get("shot")
    scan = values.get("scan")
    if mode == "train" and (not fire or not scan):
        return "scan" if rng.random() < .5 else "shot"
    if fire and scan and fire["visits"] >= MIN_VISITS and scan["visits"] >= MIN_VISITS:
        return "scan" if scan["meanRemainingActions"] < fire["meanRemainingActions"] else "shot"
    return "shot"


def simulate_game(style, seed, mode, table=None, training=False):
    rng = np.random.default_rng(seed)
    ships = generate_fleet(rng, style)
    owner = {cell: ship_id for ship_id, ship in enumerate(ships) for cell in ship}
    sunk_ids = set()
    shots = set()
    outcomes = {}
    scans = []
    charge = True
    history = []
    invalid = 0
    max_actions = 120
    turn = "ai"
    for step in range(max_actions * 2):
        if turn == "player":
            # The player turn is represented as a no-op because the objective is
            # target-fleet AI actions; it cannot change that hidden fleet.
            turn = "ai"
            continue
        remaining_lengths = [len(ship) for i, ship in enumerate(ships) if i not in sunk_ids]
        candidates = density_candidates(remaining_lengths, shots, outcomes, scans)
        context = observable_features(shots, outcomes, remaining_lengths, candidates, scans)
        epsilon = max(.03, .45 * (1 - step / max_actions)) if training else 0.0
        action = choose_action(mode, context, None, shots, outcomes, charge, table or {}, rng, epsilon)
        history.append((context["key"], action))
        if action == "scan":
            center = context["region"]["center"]
            row, col = center
            count = scan_unshot_count(owner, shots, (row, col))
            scans.append({"center": center, "count": count, "shotsObserved": len(shots)})
            charge = False
            turn = "player"
        else:
            legal = legal_shots(shots)
            if mode == "random":
                cell = legal[int(rng.integers(len(legal)))]
            else:
                # Same candidate ordering as the production solver: score desc,
                # then stable row/column order. Occupancy weight is gated at zero.
                cell = min(candidates, key=lambda item: (-item["score"], item["cell"][0], item["cell"][1]))["cell"]
            if cell in shots or cell not in legal:
                invalid += 1
                break
            shots.add(cell)
            if cell in owner:
                ship_id = owner[cell]
                outcomes[cell] = "hit"
                if all(part in shots for part in ships[ship_id]):
                    sunk_ids.add(ship_id)
                    for part in ships[ship_id]:
                        if part in shots:
                            outcomes[part] = "sunk"
            else:
                outcomes[cell] = "miss"
                turn = "player"
        if len(sunk_ids) == len(ships):
            break
    sunk = len(sunk_ids) == len(ships)
    hits = sum(result in ("hit", "sunk") for result in outcomes.values())
    return {
        "actions": len(history), "shots": len(shots), "scans": len(scans),
        "hitRate": hits / max(1, len(shots)), "invalidOrRepeated": invalid,
        "sunk": sunk, "history": history,
    }


def train_table(games, seed):
    rng = np.random.default_rng(seed)
    table = create_table()
    for game in range(games):
        style = PLACEMENT_STYLES[game % len(PLACEMENT_STYLES)]
        episode_seed = int(rng.integers(0, 2**31 - 1))
        # The simulator's per-step epsilon decays with episode progress; the
        # table policy explores both legal actions and learns full-game return.
        result = simulate_game(style, episode_seed, "train", table, training=True)
        total_actions = result["actions"]
        for index, (key, action) in enumerate(result["history"]):
            record_cost(table, key, action, total_actions - index)
    return table


def evaluate(table, layouts, seed):
    results = {}
    for mode in ("random", "pdm", "fixed", "learned"):
        games = []
        for index, (style, layout_seed) in enumerate(layouts):
            if mode == "learned":
                # Install the exact held-out fleet into a deterministic simulator
                # path while keeping that fleet inaccessible to action selection.
                game = simulate_fixed_layout(style, layout_seed, mode, table, seed + index)
            else:
                game = simulate_fixed_layout(style, layout_seed, mode, table, seed + index)
            games.append(game)
        results[mode] = aggregate(games)
        results[mode]["actionsPerLayout"] = [game["actions"] for game in games]
    learned = results["learned"]["actionsPerLayout"]
    fixed = results["fixed"]["actionsPerLayout"]
    deltas = np.asarray(learned) - np.asarray(fixed)
    boot_rng = np.random.default_rng(seed + 123456)
    samples = np.mean(deltas[boot_rng.integers(0, len(deltas), (2000, len(deltas)))], axis=1)
    results["learnedMinusFixedActions"] = {
        "mean": float(np.mean(deltas)),
        "bootstrap95CI": [float(np.quantile(samples, .025)), float(np.quantile(samples, .975))],
    }
    for mode in ("random", "pdm", "fixed", "learned"):
        del results[mode]["actionsPerLayout"]
    return results


def simulate_fixed_layout(style, layout_seed, mode, table, decision_seed):
    # Build an exact held-out layout, then pass it only to outcome resolution.
    layout_rng = np.random.default_rng(layout_seed)
    ships = generate_fleet(layout_rng, style)
    return simulate_game_with_ships(ships, decision_seed, mode, table)


def simulate_game_with_ships(ships, seed, mode, table):
    rng = np.random.default_rng(seed)
    owner = {cell: ship_id for ship_id, ship in enumerate(ships) for cell in ship}
    sunk_ids, shots, outcomes, scans = set(), set(), {}, []
    charge, history, invalid = True, [], 0
    turn = "ai"
    for _ in range(240):
        if turn == "player":
            turn = "ai"
            continue
        remaining_lengths = [len(ship) for i, ship in enumerate(ships) if i not in sunk_ids]
        candidates = density_candidates(remaining_lengths, shots, outcomes, scans)
        context = observable_features(shots, outcomes, remaining_lengths, candidates, scans)
        action = choose_action(mode, context, None, shots, outcomes, charge, table, rng)
        history.append((context["key"], action))
        if action == "scan":
            row, col = context["region"]["center"]
            count = scan_unshot_count(owner, shots, (row, col))
            scans.append({"center": (row, col), "count": count, "shotsObserved": len(shots)})
            charge = False
            turn = "player"
        else:
            legal = legal_shots(shots)
            cell = legal[int(rng.integers(len(legal)))] if mode == "random" else min(
                candidates, key=lambda item: (-item["score"], item["cell"][0], item["cell"][1]))["cell"]
            if cell in shots or cell not in legal:
                invalid += 1
                break
            shots.add(cell)
            if cell in owner:
                ship_id = owner[cell]
                outcomes[cell] = "hit"
                if all(part in shots for part in ships[ship_id]):
                    sunk_ids.add(ship_id)
                    for part in ships[ship_id]:
                        if part in shots:
                            outcomes[part] = "sunk"
            else:
                outcomes[cell] = "miss"
                turn = "player"
        if len(sunk_ids) == len(ships):
            break
    hits = sum(result in ("hit", "sunk") for result in outcomes.values())
    return {"actions": len(history), "shots": len(shots), "scans": len(scans),
            "hitRate": hits / max(1, len(shots)), "invalidOrRepeated": invalid,
            "sunk": len(sunk_ids) == len(ships), "history": history}


def aggregate(games):
    return {
        "games": len(games), "meanAIActionsToSink": float(np.mean([game["actions"] for game in games])),
        "meanShots": float(np.mean([game["shots"] for game in games])),
        "meanHitRate": float(np.mean([game["hitRate"] for game in games])),
        "meanScans": float(np.mean([game["scans"] for game in games])),
        "invalidOrRepeated": int(sum(game["invalidOrRepeated"] for game in games)),
        "incompleteGames": int(sum(not game["sunk"] for game in games)),
    }


def train_replicate(seed, train_games, eval_games):
    table = train_table(train_games, seed)
    layout_seeds = np.random.default_rng(seed + 5000)
    style_results = {}
    for style in EVAL_STYLES:
        layouts = [(style, int(layout_seeds.integers(0, 2**31 - 1))) for _ in range(eval_games)]
        style_results[style] = evaluate(table, layouts, seed + 6000)
    return table, style_results


def run(output: Path, train_games: int, eval_games: int, seeds: list[int]):
    output.mkdir(parents=True, exist_ok=True)
    replicas = []
    first_table = None
    for seed in seeds:
        table, metrics = train_replicate(seed, train_games, eval_games)
        if first_table is None:
            first_table = table
        replicas.append({"seed": seed, "trainingGames": train_games, "evaluation": metrics})
    # Predeclared enable gate: improve over fixed scan rule in aggregate and do
    # not regress in mean AI actions in any held-out placement style or seed.
    style_delta = {style: float(np.mean([
        replica["evaluation"][style]["learnedMinusFixedActions"]["mean"] for replica in replicas
    ])) for style in EVAL_STYLES}
    no_style_regression = all(value <= 0 for value in style_delta.values())
    per_seed_no_regression = all(all(
        replica["evaluation"][style]["learnedMinusFixedActions"]["mean"] <= 0 for style in EVAL_STYLES
    ) for replica in replicas)
    enabled = bool(no_style_regression and per_seed_no_regression and any(value < 0 for value in style_delta.values()))
    artifact = {
        "format": "adaptive-battleship-sonar-tabular-q-v1", "version": ACTION_POLICY_VERSION,
        "simulatorVersion": SIMULATOR_VERSION, "seeds": seeds, "trainingGamesPerSeed": train_games,
        "minimumVisitsPerAction": MIN_VISITS, "features": ["shotsBucket", "activeUnsunkHit", "fewRemainingShips",
            "relativeScoreEntropyBucket", "regionScoreShareBucket"],
        "actionValueTarget": "mean remaining AI actions to sink, including the current action",
        "relativeScoreCriterion": "normalized relative PDM score share; not a calibrated probability",
        "table": first_table, "runtimeEnabled": enabled,
    }
    report = {"experiment": "sonar_action_policy", "simulatorVersion": SIMULATOR_VERSION,
        "actionPolicyVersion": ACTION_POLICY_VERSION, "seeds": seeds, "trainingGamesPerSeed": train_games,
        "evaluationGamesPerStylePerSeed": eval_games, "trainingPlacementStyles": list(PLACEMENT_STYLES),
        "heldOutPlacementStyles": list(EVAL_STYLES), "reward": "-1 per AI shot or scan until all ships sink",
        "occupancyModelWeight": 0, "runtimeEnabled": enabled,
        "runtimeDecision": "tabular policy enabled" if enabled else "fixed-scan fallback; learned policy did not pass acceptance gate",
        "meanPairedLearnedMinusFixedActionsByStyle": style_delta,
        "replicates": replicas,
        "limitations": ["Synthetic fleets and PDM-based shot continuation only.",
            "No player strategy or two-sided win-rate model.", "Occupancy MLP failed its prior gameplay gate and is excluded."]}
    js = "// Generated by model/src/sonar_action_experiment.py; do not edit by hand.\n"
    js += "export const SONAR_ACTION_POLICY = " + json.dumps(artifact, separators=(",", ":")) + ";\n"
    (output / "sonar_action_policy.json").write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    (output / "sonar_action_policy.js").write_text(js, encoding="utf-8")
    (Path(__file__).resolve().parents[2] / "frontend/src/ai/sonar-action-policy.generated.js").write_text(js, encoding="utf-8")
    (output / "sonar_action_results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train-games", type=int, default=1000)
    parser.add_argument("--eval-games", type=int, default=60)
    parser.add_argument("--seeds", default="20261029,20261030,20261031")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "artifacts")
    args = parser.parse_args()
    print(json.dumps(run(args.output, args.train_games, args.eval_games,
                         [int(seed) for seed in args.seeds.split(",")]), indent=2))
