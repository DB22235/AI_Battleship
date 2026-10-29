import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import sonar_action_experiment as experiment


class SonarActionExperimentTests(unittest.TestCase):
    def test_scan_count_is_aggregate_unshot_cells_only(self):
        hidden = {(r, c) for r in range(3, 6) for c in range(3, 6)}
        self.assertEqual(experiment.scan_unshot_count(hidden, set(), (4, 4)), 9)
        self.assertEqual(experiment.scan_unshot_count(hidden, {(3, 3), (4, 4)}, (4, 4)), 7)

    def test_scan_requires_full_legal_three_by_three_bounds(self):
        hidden = {(0, 0), (9, 9)}
        self.assertEqual(experiment.scan_unshot_count(hidden, set(), (1, 1)), 1)
        self.assertEqual(experiment.scan_unshot_count(hidden, set(), (8, 8)), 1)
        for center in ((0, 4), (9, 4), (4, 0), (4, 9)):
            with self.assertRaises(ValueError):
                experiment.scan_unshot_count(hidden, set(), center)

    def test_observable_action_features_and_table_are_deterministic(self):
        candidates = [{"cell": (r, c), "score": float(1 + (r + c) % 3)}
                      for r in range(10) for c in range(10)]
        context_a = experiment.observable_features(set(), {}, [5, 4, 3, 3, 2], candidates, [])
        context_b = experiment.observable_features(set(), {}, [5, 4, 3, 3, 2], candidates, [])
        self.assertEqual(context_a, context_b)
        self.assertEqual(len(context_a["key"].split("|")), 5)
        self.assertNotIn("layout", context_a["features"])
        self.assertNotIn("shipCoordinates", context_a["features"])

    def test_action_selector_receives_no_hidden_layout(self):
        import inspect
        parameters = set(inspect.signature(experiment.choose_action).parameters)
        self.assertFalse({"ships", "owner", "hidden_fleet", "layout"} & parameters)

    def test_zero_charge_cannot_choose_scan(self):
        candidates = [{"cell": (r, c), "score": 1.0} for r in range(10) for c in range(10)]
        context = experiment.observable_features(set(), {}, [5, 4, 3, 3, 2], candidates, [])
        action = experiment.choose_action("train", context, None, set(), {}, False, {},
                                          np.random.default_rng(2), epsilon=0)
        self.assertEqual(action, "shot")

    def test_production_pdm_receives_aggregate_scan_only(self):
        from occupancy_experiment import density_candidates
        ships = [
            [(4, 2), (4, 3), (4, 4), (4, 5), (4, 6)],
            [(0, 0), (0, 1), (0, 2), (0, 3)],
            [(1, 0), (1, 1), (1, 2)],
            [(2, 0), (2, 1), (2, 2)],
            [(3, 0), (3, 1)],
        ]
        # The candidate policy input is this aggregate observation, not the
        # hidden cells used to construct its count.
        scan = {"center": (4, 4), "count": 5, "shotsObserved": 0}
        candidates = density_candidates([5, 4, 3, 3, 2], set(), {}, [scan])
        self.assertEqual(len(candidates), 100)
        self.assertTrue(all(set(item) == {"cell", "score"} for item in candidates))

    def test_simulated_match_uses_at_most_one_scan_and_counts_it_as_an_action(self):
        result = experiment.simulate_game("random", 180, "fixed", {}, training=False)
        self.assertLessEqual(result["scans"], 1)
        self.assertEqual(result["actions"], result["shots"] + result["scans"])
        self.assertEqual(result["invalidOrRepeated"], 0)
        self.assertTrue(result["sunk"])


if __name__ == "__main__":
    unittest.main()
