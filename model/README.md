# Offline ship-occupancy model

This folder contains the offline ML experiment, trained model artifacts, and CSV records written by the local FastAPI backend. The frontend submits observable state and legal PDM candidates to the backend for Adaptive ranking. The engine retains move legality and final shot authority.

## Secondary project review

The secondary `deep_reinforcement_learning_battleships` project is a separate one-player reinforcement-learning environment. Its policy-gradient checkpoint maps a 100-cell observation to 100 next-action probabilities and was trained with a different fleet (14 ships of lengths 1–4) and a no-touching placement rule. The primary game uses five ships of lengths 2–5 and allows adjacency. Its saved checkpoint therefore is not a valid pretrained model for this project's occupancy task, and the policy's action probabilities are not occupancy probabilities. The DQN attempt is documented by that project as unsuccessful. The external checkpoint and `.npy` evaluation data were not copied or claimed as primary-project results.

The useful transferable idea is a small learned policy network over the 10×10 observation. Here it is adapted to the handoff's primary task: binary ship-cell occupancy prediction, with hidden fleet data used only for labels and all evaluation splits grouped by complete layout.

## Reproduce

Requires Python 3.10+ and NumPy. No TensorFlow, scikit-learn, Gym, backend, or network access is needed.

```powershell
python -m pip install -r model/requirements.txt
python model/src/occupancy_experiment.py --games 600 --seed 20261028
```

The script generates legal 10×10 layouts with the primary fleet and adjacency allowed, simulates random legal shots, and creates candidate-cell snapshots at fixed shot counts. It groups all rows by layout into 70% train, 15% validation, and 15% held-out test partitions. Feature normalization is fitted on training layouts only. A small NumPy MLP is evaluated against the observable remaining-segment base-rate score using average precision and Brier score.

Artifacts are written to `model/artifacts/`:

- `occupancy_mlp.npz`: compact NumPy weights and training-only normalization values.
- `occupancy_mlp.json`: portable weight export and ordered feature contract for a future browser port.
- `occupancy_mlp.js`: same export as a native ES module.
- `../frontend/src/ai/occupancy-model.generated.js`: generated copy consumed by the frontend inference adapter.
- `results.json`: measured held-out cell-level metrics and limitations.

Full-game validation selected a zero blend weight for this synthetic model, so it is excluded from gameplay ranking. Adaptive's backend profile instead learns empirical fleet-cell frequencies from completed player deployments and blends them with legal PDM scores after at least two layouts. This profile has not been separately evaluated. Player shot coordinates are preserved for match inspection but are not used as evidence of fleet placement. The evaluation is documented in `reports/results.md`.

## Local backend data

Run the FastAPI service using `../backend/README.md`. It creates `data/` here and appends:

- `matches.csv`: match outcome, aggregate statistics, and all player shots.
- `player_fleet_layouts.csv`: one row per ship for completed player layouts.
- `adaptive_ai_learning_log.csv`: each AI targeting decision and each completed-layout profile update.

The `/api/model/score` route accepts only observable shot history and rule-generated candidate scores; it never accepts the current hidden enemy layout. The current player layout is sent to the save route only after the game ends for subsequent-match learning.
