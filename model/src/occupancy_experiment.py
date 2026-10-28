"""Offline, NumPy-only ship-occupancy experiment for Adaptive AI Battleship.

This module deliberately does not choose shots or connect to the React game.
Training labels may inspect a generated hidden fleet; feature construction may
inspect only the point-in-time public shot history and remaining fleet sizes.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from time import perf_counter

import numpy as np


BOARD_SIZE = 10
FLEET = (5, 4, 3, 3, 2)
SNAPSHOTS = (0, 3, 6, 10, 14, 18, 23, 28, 34, 40)
FEATURE_NAMES = (
    "row_norm", "col_norm", "center_distance", "edge_distance", "is_corner",
    "row_parity", "col_parity", "shots_fraction", "observed_hits_fraction",
    "observed_misses_fraction", "adjacent_unsunk_hits", "adjacent_misses",
    "diagonal_unsunk_hits", "same_row_unsunk_hits", "same_col_unsunk_hits",
    "nearest_unsunk_hit_distance", "remaining_segments_fraction",
    "remaining_ships_fraction",
)


def generate_fleet(rng: np.random.Generator) -> list[list[tuple[int, int]]]:
    """Generate a legal standard fleet; adjacency is allowed."""
    for _ in range(100):
        occupied: set[tuple[int, int]] = set()
        ships: list[list[tuple[int, int]]] = []
        valid = True
        for length in FLEET:
            placements = []
            for horizontal in (True, False):
                max_row = BOARD_SIZE if horizontal else BOARD_SIZE - length + 1
                max_col = BOARD_SIZE - length + 1 if horizontal else BOARD_SIZE
                for row in range(max_row):
                    for col in range(max_col):
                        cells = ([(row, col + i) for i in range(length)] if horizontal
                                 else [(row + i, col) for i in range(length)])
                        if not occupied.intersection(cells):
                            placements.append(cells)
            if not placements:
                valid = False
                break
            ship = placements[int(rng.integers(len(placements)))]
            ships.append(ship)
            occupied.update(ship)
        if valid:
            return ships
    raise RuntimeError("Could not generate a legal fleet after 100 layout attempts")


def neighbors(cell: tuple[int, int], diagonal: bool = False) -> list[tuple[int, int]]:
    row, col = cell
    result = []
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == dc == 0 or (not diagonal and abs(dr) + abs(dc) != 1):
                continue
            rr, cc = row + dr, col + dc
            if 0 <= rr < 10 and 0 <= cc < 10:
                result.append((rr, cc))
    return result


def feature_vector(cell, shots, outcomes, remaining_lengths, known_sunk_cells) -> np.ndarray:
    """Create features using only shots/results, sunk status and fleet lengths."""
    row, col = cell
    shot_map = dict(outcomes)
    sunk_cells = set(known_sunk_cells)
    unsunk_hits = {c for c, result in shot_map.items() if result == "hit" and c not in sunk_cells}
    misses = {c for c, result in shot_map.items() if result == "miss"}
    hit_distances = [abs(row - r) + abs(col - c) for r, c in unsunk_hits]
    center = abs(row - 4.5) + abs(col - 4.5)
    edge_distance = min(row, col, 9 - row, 9 - col)
    features = [
        row / 9, col / 9, center / 9, edge_distance / 4.5,
        float(row in (0, 9) and col in (0, 9)), row % 2, col % 2,
        len(shots) / 100, sum(v == "hit" for v in outcomes.values()) / 17,
        len(misses) / 100,
        len(set(neighbors(cell)) & unsunk_hits) / 4,
        len(set(neighbors(cell)) & misses) / 4,
        len(set(neighbors(cell, diagonal=True)) & unsunk_hits) / 4,
        sum(r == row for r, _ in unsunk_hits) / 5,
        sum(c == col for _, c in unsunk_hits) / 5,
        min(hit_distances, default=10) / 10,
        sum(remaining_lengths) / 17, len(remaining_lengths) / 5,
    ]
    return np.asarray(features, dtype=np.float32)


def make_examples(games: int, seed: int):
    rng = np.random.default_rng(seed)
    features, labels, game_ids = [], [], []
    for game_id in range(games):
        ships = generate_fleet(rng)
        owner = {cell: i for i, ship in enumerate(ships) for cell in ship}
        order = rng.permutation(100)
        shots: set[tuple[int, int]] = set()
        outcomes: dict[tuple[int, int], str] = {}
        sunk: set[int] = set()
        snapshot_set = set(SNAPSHOTS)
        for step in range(100):
            if step in snapshot_set:
                remaining = {c for i, ship in enumerate(ships) if i not in sunk for c in ship}
                for idx in range(100):
                    cell = (idx // 10, idx % 10)
                    if cell in shots:
                        continue
                    sunk_cells = {c for i, ship in enumerate(ships) if i in sunk for c in ship}
                    remaining_lengths = [len(ship) for i, ship in enumerate(ships) if i not in sunk]
                    features.append(feature_vector(cell, shots, outcomes, remaining_lengths, sunk_cells))
                    labels.append(float(cell in remaining))
                    game_ids.append(game_id)
            if len(sunk) == len(ships):
                break
            idx = int(order[step])
            cell = (idx // 10, idx % 10)
            shots.add(cell)
            if cell in owner:
                outcomes[cell] = "hit"
                ship_id = owner[cell]
                if all(c in shots for c in ships[ship_id]):
                    sunk.add(ship_id)
                    for sunk_cell in ships[ship_id]:
                        if sunk_cell in shots:
                            outcomes[sunk_cell] = "sunk"
            else:
                outcomes[cell] = "miss"
    return (np.asarray(features, dtype=np.float32), np.asarray(labels, dtype=np.float32),
            np.asarray(game_ids, dtype=np.int32))


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


class OccupancyMLP:
    """Small two-layer binary classifier implemented with NumPy only."""
    def __init__(self, input_size, seed=71, hidden=32):
        rng = np.random.default_rng(seed)
        self.w1 = rng.normal(0, np.sqrt(2 / input_size), (input_size, hidden)).astype(np.float32)
        self.b1 = np.zeros(hidden, dtype=np.float32)
        self.w2 = rng.normal(0, np.sqrt(2 / hidden), (hidden, 1)).astype(np.float32)
        self.b2 = np.zeros(1, dtype=np.float32)

    def predict(self, x):
        return sigmoid(np.tanh(x @ self.w1 + self.b1) @ self.w2 + self.b2).ravel()

    def fit(self, x, y, epochs=70, batch_size=512, learning_rate=0.015, seed=91):
        rng = np.random.default_rng(seed)
        for _ in range(epochs):
            for ids in np.array_split(rng.permutation(len(y)), max(1, (len(y) + batch_size - 1) // batch_size)):
                xb, yb = x[ids], y[ids, None]
                z1 = xb @ self.w1 + self.b1
                h = np.tanh(z1)
                p = sigmoid(h @ self.w2 + self.b2)
                dz2 = (p - yb) / len(ids)
                gw2, gb2 = h.T @ dz2, dz2.sum(axis=0)
                dz1 = (dz2 @ self.w2.T) * (1 - h * h)
                gw1, gb1 = xb.T @ dz1, dz1.sum(axis=0)
                self.w1 -= learning_rate * gw1
                self.b1 -= learning_rate * gb1
                self.w2 -= learning_rate * gw2
                self.b2 -= learning_rate * gb2


def average_precision(y_true, scores):
    order = np.argsort(-scores, kind="stable")
    positives = float(np.sum(y_true))
    if positives == 0:
        return float("nan")
    ranked = y_true[order]
    precision = np.cumsum(ranked) / np.arange(1, len(ranked) + 1)
    return float(np.sum(precision * ranked) / positives)


def score_report(y, scores):
    return {"average_precision": average_precision(y, scores),
            "brier_score": float(np.mean((y - scores) ** 2))}


def density_candidates(remaining_lengths, shots, outcomes):
    misses = {cell for cell, result in outcomes.items() if result == "miss"}
    sunk = {cell for cell, result in outcomes.items() if result == "sunk"}
    hits = {cell for cell, result in outcomes.items() if result == "hit"}
    heat = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.float64)
    target_mode = bool(hits)

    for length in remaining_lengths:
        for horizontal in (True, False):
            row_starts = range(BOARD_SIZE) if horizontal else range(BOARD_SIZE - length + 1)
            col_starts = range(BOARD_SIZE - length + 1) if horizontal else range(BOARD_SIZE)
            for row in row_starts:
                for col in col_starts:
                    cells = ([(row, col + offset) for offset in range(length)] if horizontal
                             else [(row + offset, col) for offset in range(length)])
                    keys = set(cells)
                    if keys & (misses | sunk):
                        continue
                    hit_count = sum(key in hits for key in keys)
                    weight = (0.05 if hit_count == 0 else 15 ** hit_count) if target_mode else 1.0
                    for r, c in cells:
                        if (r, c) not in shots:
                            heat[r, c] += weight

    if not target_mode and remaining_lengths:
        minimum_length = min(remaining_lengths)
        if minimum_length >= 2:
            for row in range(BOARD_SIZE):
                for col in range(BOARD_SIZE):
                    if (row + col) % minimum_length != 0:
                        heat[row, col] *= 0.15

    result = []
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if (row, col) not in shots:
                result.append({"cell": (row, col), "score": float(heat[row, col])})
    return result


def choose_policy_cell(policy, model, mean, scale, ships, shots, outcomes, sunk_ids, rng, model_weight=0.2):
    remaining_lengths = [len(ship) for i, ship in enumerate(ships) if i not in sunk_ids]
    candidates = density_candidates(remaining_lengths, shots, outcomes)
    if policy == "hybrid" and model_weight > 0:
        sunk_cells = {cell for cell, result in outcomes.items() if result == "sunk"}
        features = np.stack([
            feature_vector(item["cell"], shots, outcomes, remaining_lengths, sunk_cells)
            for item in candidates
        ])
        model_scores = model.predict(np.clip((features - mean) / scale, -5, 5).astype(np.float32))
        rule_scores = np.asarray([max(0, item["score"]) for item in candidates], dtype=np.float64)
        rule_total = rule_scores.sum() or 1
        model_total = model_scores.sum() or 1
        combined = (1 - model_weight) * (rule_scores / rule_total) + model_weight * (model_scores / model_total)
    else:
        combined = np.asarray([item["score"] for item in candidates], dtype=np.float64)
    maximum = np.max(combined)
    best = np.flatnonzero(np.isclose(combined, maximum))
    return candidates[int(rng.choice(best))]["cell"]


def evaluate_full_games(model, mean, scale, games=150, seed=20266028, model_weight=0.2, layouts=None):
    if layouts is None:
        rng = np.random.default_rng(seed)
        layouts = [generate_fleet(rng) for _ in range(games)]
    games = len(layouts)
    results = {}
    for policy in ("pdm", "hybrid"):
        shot_counts, hit_counts, invalid_counts, decision_times = [], [], [], []
        for game_index, ships in enumerate(layouts):
            local_rng = np.random.default_rng(seed + game_index * 3)
            owner = {cell: i for i, ship in enumerate(ships) for cell in ship}
            shots: set[tuple[int, int]] = set()
            outcomes: dict[tuple[int, int], str] = {}
            sunk_ids: set[int] = set()
            invalid = 0
            while len(sunk_ids) < len(ships):
                start = perf_counter()
                cell = choose_policy_cell(policy, model, mean, scale, ships, shots, outcomes, sunk_ids, local_rng,
                                          model_weight=model_weight)
                decision_times.append(perf_counter() - start)
                if cell in shots or not (0 <= cell[0] < 10 and 0 <= cell[1] < 10):
                    invalid += 1
                    break
                shots.add(cell)
                if cell in owner:
                    outcomes[cell] = "hit"
                    ship_id = owner[cell]
                    if all(part in shots for part in ships[ship_id]):
                        sunk_ids.add(ship_id)
                        for part in ships[ship_id]:
                            if part in shots:
                                outcomes[part] = "sunk"
                else:
                    outcomes[cell] = "miss"
            shot_counts.append(len(shots))
            hit_counts.append(sum(value in ("hit", "sunk") for value in outcomes.values()))
            invalid_counts.append(invalid)
        total_shots = sum(shot_counts)
        results[policy] = {
            "games": games,
            "mean_shots_to_sink": float(np.mean(shot_counts)),
            "median_shots_to_sink": float(np.median(shot_counts)),
            "mean_hit_rate": float(sum(hit_counts) / total_shots) if total_shots else 0,
            "invalid_or_repeated_shots": int(sum(invalid_counts)),
            "mean_decision_time_ms": float(np.mean(decision_times) * 1000),
        }
    results["hybrid_minus_pdm_mean_shots"] = (
        results["hybrid"]["mean_shots_to_sink"] - results["pdm"]["mean_shots_to_sink"]
    )
    return results


def run(output: Path, games: int, seed: int):
    output.mkdir(parents=True, exist_ok=True)
    x, y, game_ids = make_examples(games, seed)
    unique_games = np.arange(games)
    rng = np.random.default_rng(seed + 1)
    rng.shuffle(unique_games)
    n_train, n_val = int(games * .70), int(games * .15)
    train_games = set(unique_games[:n_train].tolist())
    val_games = set(unique_games[n_train:n_train + n_val].tolist())
    test_games = set(unique_games[n_train + n_val:].tolist())
    train = np.isin(game_ids, list(train_games))
    val = np.isin(game_ids, list(val_games))
    test = np.isin(game_ids, list(test_games))

    # Standardization parameters come from training games only.
    mean, scale = x[train].mean(axis=0), x[train].std(axis=0)
    scale[scale < 1e-6] = 1
    z = np.clip((x - mean) / scale, -5, 5).astype(np.float32)
    model = OccupancyMLP(x.shape[1], seed=seed + 2)
    model.fit(z[train], y[train])
    export = {"format": "adaptive-battleship-occupancy-mlp-v1", "features": list(FEATURE_NAMES),
              "hidden_activation": "tanh", "output_activation": "sigmoid",
              "weights": {k: v.tolist() for k, v in {
                  "w1": model.w1, "b1": model.b1, "w2": model.w2, "b2": model.b2,
                  "mean": mean, "scale": scale}.items()}}
    validation_rng = np.random.default_rng(seed + 4000)
    validation_layouts = [generate_fleet(validation_rng) for _ in range(90)]
    validation_weights = {}
    for weight in (0.0, 0.05, 0.1, 0.2):
        validation_results = evaluate_full_games(model, mean, scale, seed=seed + 4000,
                                                 model_weight=weight, layouts=validation_layouts)
        validation_weights[str(weight)] = validation_results["hybrid"]["mean_shots_to_sink"]
    selected_weight = min((float(weight) for weight in validation_weights),
                          key=lambda weight: validation_weights[str(weight)])
    export["recommended_hybrid_weight"] = selected_weight
    test_rng = np.random.default_rng(seed + 5000)
    test_layouts = [generate_fleet(test_rng) for _ in range(150)]
    policy_evaluation = evaluate_full_games(model, mean, scale, seed=seed + 5000,
                                            model_weight=selected_weight, layouts=test_layouts)
    export["recommended_hybrid_weight"] = selected_weight
    model_score = model.predict(z[test])
    # Observable base rate: known remaining ship segments / unshot cells.
    # Since snapshots are bundled by game, calculate it from the visible feature.
    test_shots_fraction = x[test, FEATURE_NAMES.index("shots_fraction")]
    test_remaining_fraction = x[test, FEATURE_NAMES.index("remaining_segments_fraction")]
    baseline_score = np.clip(test_remaining_fraction * 17 / np.maximum(100 * (1 - test_shots_fraction), 1), 0, 1)
    report = {
        "experiment": "ship_cell_occupancy",
        "seed": seed,
        "games": games,
        "split_by_complete_game": {"train": len(train_games), "validation": len(val_games), "test": len(test_games)},
        "rows": {"train": int(train.sum()), "validation": int(val.sum()), "test": int(test.sum())},
        "features": list(FEATURE_NAMES),
        "held_out_test": {
            "positive_rate": float(y[test].mean()),
            "observable_base_rate": score_report(y[test], baseline_score),
            "numpy_mlp": score_report(y[test], model_score),
        },
        "validation_policy_weight_selection": {
            "layout_count": len(validation_layouts),
            "mean_shots_by_model_weight": validation_weights,
            "selected_model_weight": selected_weight,
        },
        "full_game_policy_evaluation_on_independent_layouts": policy_evaluation,
        "limitations": [
            "Synthetic uniformly placed standard fleets only; no real-human generalization claim.",
            "Full-game evaluation is one configured deterministic-weight hybrid comparison, not a measured two-sided win rate.",
            "The browser uses a direct JavaScript inference port and a separate local fleet-history prior; this report evaluates only the offline synthetic-model hybrid.",
        ],
    }
    np.savez_compressed(output / "occupancy_mlp.npz", w1=model.w1, b1=model.b1,
                        w2=model.w2, b2=model.b2, mean=mean, scale=scale)
    (output / "occupancy_mlp.json").write_text(json.dumps(export, separators=(",", ":")), encoding="utf-8")
    js_export = "// Generated by model/src/occupancy_experiment.py; do not edit by hand.\n"
    js_export += "export const OCCUPANCY_MLP = " + json.dumps(export, separators=(",", ":")) + ";\n"
    (output / "occupancy_mlp.js").write_text(js_export, encoding="utf-8")
    frontend_model = Path(__file__).resolve().parents[2] / "frontend" / "src" / "ai" / "occupancy-model.generated.js"
    frontend_model.parent.mkdir(parents=True, exist_ok=True)
    frontend_model.write_text(js_export, encoding="utf-8")
    (output / "results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games", type=int, default=600)
    parser.add_argument("--seed", type=int, default=20261028)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "artifacts")
    args = parser.parse_args()
    print(json.dumps(run(args.output, args.games, args.seed), indent=2))
