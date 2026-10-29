import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import occupancy_experiment as experiment


class OccupancyExperimentTests(unittest.TestCase):
    def test_fleet_styles_are_legal_and_reproducible(self):
        for style in ("random", "edge", "center", "corner"):
            first = experiment.generate_fleet(np.random.default_rng(42), style)
            second = experiment.generate_fleet(np.random.default_rng(42), style)
            self.assertEqual(first, second)
            self.assertEqual(sorted(map(len, first)), [2, 3, 3, 4, 5])
            cells = [cell for ship in first for cell in ship]
            self.assertEqual(len(cells), len(set(cells)))
            self.assertTrue(all(0 <= r < 10 and 0 <= c < 10 for r, c in cells))

    def test_features_depend_only_on_observable_inputs(self):
        cell = (4, 4)
        shots = {(4, 3)}
        outcomes = {(4, 3): "hit"}
        values = experiment.feature_vector(cell, shots, outcomes, [5, 4, 3, 3, 2], set())
        self.assertEqual(values.shape, (len(experiment.FEATURE_NAMES),))
        self.assertFalse(any("layout" in name or "style" in name or "ship_id" in name
                             for name in experiment.FEATURE_NAMES))
        self.assertEqual(experiment.feature_vector(cell, shots, outcomes, [5, 4, 3, 3, 2], set()).tolist(),
                         values.tolist())

    def test_trajectory_examples_are_deterministic_and_grouped_by_game(self):
        x1, y1, ids1 = experiment.make_examples(6, 19)
        x2, y2, ids2 = experiment.make_examples(6, 19)
        np.testing.assert_array_equal(x1, x2)
        np.testing.assert_array_equal(y1, y2)
        np.testing.assert_array_equal(ids1, ids2)
        self.assertEqual(set(ids1.tolist()), set(range(6)))
        self.assertGreater(int(np.sum(y1)), 0)

    def test_split_keeps_complete_games_together(self):
        game_ids = np.repeat(np.arange(20), 4)
        train, validation, test, train_ids, validation_ids, test_ids = experiment.grouped_game_split(
            game_ids, 20, seed=77)
        self.assertFalse(train_ids & validation_ids)
        self.assertFalse(train_ids & test_ids)
        self.assertFalse(validation_ids & test_ids)
        self.assertEqual(set(game_ids[train].tolist()), train_ids)
        self.assertEqual(set(game_ids[validation].tolist()), validation_ids)
        self.assertEqual(set(game_ids[test].tolist()), test_ids)

    def test_policy_candidates_never_repeat_shots(self):
        ships = experiment.generate_fleet(np.random.default_rng(8))
        for policy in ("random", "pdm"):
            shots, outcomes, sunk = set(), {}, set()
            rng = np.random.default_rng(5)
            for _ in range(10):
                remaining = [len(ship) for i, ship in enumerate(ships) if i not in sunk]
                cell = experiment.choose_policy_cell(policy, None, None, None, remaining, shots, outcomes, rng)
                self.assertNotIn(cell, shots)
                self.assertTrue(0 <= cell[0] < 10 and 0 <= cell[1] < 10)
                shots.add(cell)

    def test_simulated_pdm_modes_match_runtime_tie_rules(self):
        ships = experiment.generate_fleet(np.random.default_rng(12))
        candidates = experiment.density_candidates([5, 4, 3, 3, 2], set(), {})
        best = max(item["score"] for item in candidates)
        eligible = {item["cell"] for item in candidates if item["score"] >= best * .95}
        selected = experiment.choose_policy_cell("pdm", None, None, None, [5, 4, 3, 3, 2], set(), {},
                                                  np.random.default_rng(3))
        self.assertIn(selected, eligible)
        commander = experiment.choose_policy_cell("commander", None, None, None, [5, 4, 3, 3, 2], set(), {},
                                                    np.random.default_rng(3))
        self.assertEqual(commander, next(item["cell"] for item in candidates if item["score"] == best))


if __name__ == "__main__":
    unittest.main()
