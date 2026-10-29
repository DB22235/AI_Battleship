# Offline ship-occupancy model

This folder contains the offline ML experiment, trained model artifacts, and CSV records written by the local FastAPI backend. The frontend submits observable state and legal PDM candidates to the backend for Adaptive ranking. The engine retains move legality and final shot authority.

## Secondary project review

The secondary `deep_reinforcement_learning_battleships` project is a separate one-player reinforcement-learning environment. Its policy-gradient checkpoint maps a 100-cell observation to 100 next-action probabilities and was trained with a different fleet (14 ships of lengths 1–4) and a no-touching placement rule. The primary game uses five ships of lengths 2–5 and allows adjacency. Its saved checkpoint therefore is not a valid pretrained model for this project's occupancy task, and the policy's action probabilities are not occupancy probabilities. The DQN attempt is documented by that project as unsuccessful. The external checkpoint and `.npy` evaluation data were not copied or claimed as primary-project results.

The useful transferable idea is a small learned policy network over the 10×10 observation. Here it is adapted to the handoff's primary task: binary ship-cell occupancy prediction, with hidden fleet data used only for labels and all evaluation splits grouped by complete layout.

## Reproduce

Requires Python 3.10+ and NumPy. No TensorFlow, scikit-learn, Gym, backend, or network access is needed.

```powershell
python -m pip install -r model/requirements.txt
python -m unittest discover -s model/tests -v
python model/src/occupancy_experiment.py --games 600 --seeds 20261028,20261029,20261030
npm --prefix frontend test
npm --prefix frontend run build
```

The generator records point-in-time snapshots from a predeclared action mixture: 40% current Strategist PDM choices (random among candidates within 5% of the top score), 20% current Commander PDM choices (first exact maximum), 25% noisy PDM choices sampled among the top quintile, and 15% random legal shots. Training layouts cycle through random, edge-biased, and center-biased placement. Corner-biased layouts are excluded from model fitting and validation, then used as a placement-style holdout. All snapshots stay grouped by complete layout in 70% train / 15% validation / 15% test splits, and normalization is fit on training layouts only. Fleet placement style and hidden fleet cells never enter the feature vector. The feature builder uses observable shot/outcome history and remaining ship lengths; this occupancy experiment does not use Sonar actions or observations.

The declared gameplay blend candidates are `{0, 0.05, 0.10, 0.20}`. Validation selects a weight; held-out games are used only for final reporting and a conservative enable/disable gate, not to tune it. Evaluation compares random legal shots, PDM-only, and PDM plus the selected occupancy score on the same layouts. Per-layout paired bootstrap intervals are recorded. Three independent seeds are run by default; `--seeds` accepts another comma-separated set. The first seed's MLP is exported. Its runtime weight is set to zero unless every seed and all four held-out placement styles have a paired 95% bootstrap upper bound below zero, with aggregate improvement for every style.

Artifacts are written to `model/artifacts/`:

- `occupancy_mlp.npz`: compact NumPy weights and training-only normalization values.
- `occupancy_mlp.json`: portable weight export and ordered feature contract for a future browser port.
- `occupancy_mlp.js`: same export as a native ES module.
- `replicates/<seed>/`: per-seed model exports and detailed evaluation reports for independent runs after the exported first seed.
- `../frontend/src/ai/occupancy-model.generated.js`: generated copy consumed by the frontend inference adapter.
- `results.json`: all seed-specific held-out cell-ranking and gameplay metrics, paired uncertainty, validation-only weight selection, and the runtime enable/disable decision.

The occupancy MLP is a cell-occupancy predictor, not an action-selection policy. The rule-based engine still ranks/selects legal shots; the learned cell score can only blend into PDM candidate rankings if this evaluation supports it. A zero runtime weight means the model is exported for research/inference parity but is not active in gameplay. Browser-local fleet-history profiles are a separate adaptation signal and are not part of this experiment. Player shot coordinates are not used as evidence of fleet placement. The evaluation is documented in `reports/results.md`.

## Sonar shot-versus-scan action policy

The separate contextual action-value experiment is documented in `SONAR_ACTION_POLICY.md`. Reproduce its 3,000 training matches and held-out evaluation with:

```powershell
python model/src/sonar_action_experiment.py --train-games 1000 --eval-games 60 --seeds 20261029,20261030,20261031
```

It compares random legal shots, PDM-only shots, the fixed 20% score-mass scan rule, and the learned tabular action-value policy on identical held-out layouts. The generated artifacts are `artifacts/sonar_action_policy.json`, `artifacts/sonar_action_policy.js`, and `artifacts/sonar_action_results.json`, plus the browser module `frontend/src/ai/sonar-action-policy.generated.js`. The policy artifact is enabled only after the documented held-out acceptance gate passes. The occupancy MLP's saved gameplay weight remains zero and is excluded from this action experiment.

## Local backend data

Run the FastAPI service using `../backend/README.md`. It creates `data/` here and appends:

- `matches.csv`: match outcome, aggregate statistics, and all player shots.
- `player_fleet_layouts.csv`: one row per ship for completed player layouts.
- `adaptive_ai_learning_log.csv`: each AI targeting decision and each completed-layout profile update.

The `/api/model/score` route accepts only observable shot history and rule-generated candidate scores; it never accepts the current hidden enemy layout. The current player layout is sent to the save route only after the game ends for subsequent-match learning.
