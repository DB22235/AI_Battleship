# Ship occupancy experiment results

**Task:** rank unshot cells by whether they contain a segment of a still-unsunk ship. This is a cell-level synthetic prediction experiment, not a full-game policy test.

## Run configuration

- Generator seed: `20261028`
- Layouts: 600 legal standard 10×10 fleets; adjacency allowed
- Fleet: lengths 5, 4, 3, 3, 2
- Observable snapshots: before shots 0, 3, 6, 10, 14, 18, 23, 28, 34, and 40
- Split: 420 train / 90 validation / 90 test layouts; grouped by complete layout
- Candidate rows: 346,080 train / 74,160 validation / 74,160 test
- Model: NumPy MLP with one 32-unit tanh hidden layer
- Baseline: remaining ship segments divided by unshot cells, using only observable remaining fleet and shot count

## Held-out test results

| Score | Average precision ↑ | Brier score ↓ |
|---|---:|---:|
| Observable base-rate baseline | 0.1667 | 0.1413 |
| NumPy occupancy MLP | 0.3598 | 0.1259 |

The held-out positive-cell rate was 0.1668. The MLP ranked occupied candidates better than the uninformative base-rate score and had a lower Brier score on this generated test set. This is preliminary evidence on the simulator's uniformly sampled layouts only; it does not establish performance on human layouts or improvement in actual Battleship play.

## Full-game policy comparison

The MLP blend weight was selected on 90 separate validation layouts from `{0.00, 0.05, 0.10, 0.20}`. Mean shots-to-sink were 44.28, 45.89, 45.80, and 46.17 respectively. Validation therefore selected **0.00**. On 150 independent test layouts, both PDM and the selected hybrid averaged **44.94 shots**, with a median of **44.5**, hit rate **37.83%**, and **zero invalid/repeated shots**. Mean decision time in this Python simulation was 2.23 ms for PDM and 2.27 ms for the selected hybrid. Since the selected weight is zero, the synthetic model did not improve targeting and is disabled in gameplay shot ranking.

The JavaScript MLP inference port remains available in the frontend code, but respects the selected zero weight. Adaptive's active personal signal is the separate browser-local fleet-layout profile learned from the player's completed matches. That personal-history blend has not yet had a dedicated simulated evaluation against repeated placement styles; its influence is deliberately small and relative, not a calibrated probability.

## Scope and limitations

- The blend weight was tuned on a separate 90-layout validation set; the final full-game evaluation used 150 independent layouts.
- No two-sided win-rate evaluation was run; the full-game test is one-sided shots-to-sink against fixed hidden layouts.
- Synthetic layout results do not establish adaptation to real players.
- The secondary project's pretrained policy-gradient checkpoint was not reused because its action probabilities, fleet, and touching rule do not match this occupancy task.
- Reproduce with `python model/src/occupancy_experiment.py --games 600 --seed 20261028`.
