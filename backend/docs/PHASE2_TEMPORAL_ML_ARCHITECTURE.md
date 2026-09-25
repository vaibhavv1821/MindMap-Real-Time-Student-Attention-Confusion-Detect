# MindMap ~ Phase 2: Temporal Behavioural Intelligence & Machine Learning Architecture

## Technical Documentation for Viva Presentation & System Evaluation

---

### 1. Why Temporal Analysis is Needed
Instantaneous frame-level facial features (such as MediaPipe landmarks or single-frame EAR) cannot reliably represent affective or cognitive states such as **attention** or **confusion**:
- **Blinking:** A single frame with closed eyes ($\text{EAR} < 0.15$) is a normal biological event occurring 12–20 times per minute, not an indicator of sleep or disengagement.
- **Micro-Saccades & Glances:** Glancing down at lecture notes or off-screen for 200ms is standard learner behaviour, not persistent distraction.
- **Fleeting Expressions:** A momentary eyebrow raise or furrow lasting 100ms often reflects visual adjustment rather than intellectual confusion.

Cognitive engagement and confusion are **inherently temporal processes**. By aggregating feature dynamics across a temporal window, the system distinguishes:
- Brief involuntary blinks ($60-400\,\text{ms}$) from prolonged eye closures / drowsiness ($>400\,\text{ms}$).
- Momentary glances from sustained screen gaze deflection ($>800\,\text{ms}$).
- Brief facial ticks from persistent eyebrow furrowing indicative of cognitive struggle.

---

### 2. Temporal Window Design
- **Window Type:** Sliding First-In First-Out (FIFO) queue with time-based and capacity-based pruning.
- **Window Length:** Configurable between $1.0\,\text{s}$ and $3.0\,\text{s}$ (default: $2.5\,\text{s}$ or $30-90$ frames at typical 30 FPS).
- **FPS Agnostic:** The buffer prunes samples based on real timestamps ($\Delta t = t_{\text{curr}} - t_{\text{sample}} > T_{\text{window}}$), meaning it dynamically adapts to any camera framerate ($15, 30, 60\,\text{FPS}$) without hardcoded framerate assumptions.
- **Sample Eviction & Reset:** Bounded capacity ($120$ frames max) prevents memory leaks. The buffer is cleanly flushed (`.reset()`) on session start/stop.

---

### 3. Features Extracted and Consumed by the Model
The temporal aggregator extracts a standardized $15$-dimensional numerical feature vector:

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `ear_mean` | Float | Mean bilateral Eye Aspect Ratio across valid frames |
| `ear_std` | Float | Standard deviation of EAR (indicates blink variability) |
| `gaze_deviation_mean` | Float | Average deflection distance from central line-of-sight $[0, 1]$ |
| `gaze_center_percent` | Float | Percentage of window frames classified as `CENTER` $[0, 100]$ |
| `gaze_away_percent` | Float | Percentage of window frames classified as `AWAY` $[0, 100]$ |
| `sustained_gaze_away_duration_ms` | Float | Longest unbroken streak of gaze away in milliseconds |
| `head_yaw_variance` | Float | Sample variance of horizontal head rotation (degrees$^2$) |
| `head_pitch_variance` | Float | Sample variance of vertical head tilt (degrees$^2$) |
| `head_roll_variance` | Float | Sample variance of lateral head tilt (degrees$^2$) |
| `head_movement_magnitude` | Float | Mean frame-to-frame 3D angular velocity (degrees/frame) |
| `blink_rate` | Float | Rolling blink frequency per minute |
| `avg_closure_duration_ms` | Float | Average eye closure duration (ms) for closed frames |
| `brow_furrow_mean` | Float | Average eyebrow contraction score $[0, 1]$ |
| `brow_furrow_persistence` | Float | Percentage of window with contracted brows $[0, 100]$ |
| `valid_face_percentage` | Float | Ratio of frames with localized face mesh $[0, 100]$ |

---

### 4. Random Forest Model Architecture
- **Classifier Type:** `sklearn.ensemble.RandomForestClassifier`
- **Ensemble Hyperparameters:**
  - `n_estimators`: 40 decision trees (lightweight, rapid inference $<2\,\text{ms}$)
  - `max_depth`: 5 levels (prevents overfitting and ensures interpretable decision paths)
  - `min_samples_split`: 4
  - `criterion`: Gini impurity
- **Multi-Task Topology:** Two independent binary classifiers:
  1. `attention_rf`: Predicts `ATTENTIVE` vs `INATTENTIVE`
  2. `confusion_rf`: Predicts `NORMAL` vs `POSSIBLY_CONFUSED`

---

### 5. Prediction Methodology & Target Labels
- **Attention Target:**
  - `ATTENTIVE`: High screen focus ($\text{gaze\_center\_percent} \ge 70\%$), low head movement variance, regular blink dynamics.
  - `INATTENTIVE`: High gaze away, large head yaw/pitch deflection, sustained looking away ($>800\,\text{ms}$), prolonged eye closures, or frequent face absence.
- **Confusion Target:**
  - `NORMAL`: Relaxed brow musculature ($\text{brow\_furrow\_score} < 0.35$), stable upright posture.
  - `POSSIBLY_CONFUSED`: High eyebrow furrow persistence ($>40\%$), elevated head roll variance (characteristic head tilt), focal gaze search patterns.

---

### 6. Score Conversion Formulation
Scores are directly computed from the Random Forest class probabilities ($P \in [0.0, 1.0]$):
$$\text{attention\_score} = \operatorname{round}\left(P(\text{ATTENTIVE}) \times 100\right)$$
$$\text{confusion\_score} = \operatorname{round}\left(P(\text{POSSIBLY\_CONFUSED}) \times 100\right)$$
$$\text{confidence} = \operatorname{round}\left(\frac{\max(P_{\text{att}}, 1-P_{\text{att}}) + \max(P_{\text{conf}}, 1-P_{\text{conf}})}{2} \times 100\right)$$

Scores are strictly bounded between $0$ and $100$. No hardcoded fake scores are used.

---

### 7. Behavioural Explanations (Explainability Layer)
Rather than a "black-box" prediction, the system extracts the physical behavioural indicators responsible for the state:
- **Attentive:**
  - *"Stable screen gaze (92% center focus)"*
  - *"Low head movement (steady posture)"*
  - *"Normal blink dynamics"*
- **Inattentive:**
  - *"Sustained gaze away (1.4s deflection)"*
  - *"Elevated head movement (5.2°/frame)"*
  - *"Prolonged eye closure episode"*
  - *"Face occluded / dropped (35% loss)"*
- **Possibly Confused:**
  - *"Persistent brow furrowing (68% persistence)"*
  - *"Head tilt detected during comprehension (roll variance: 22°)"*
  - *"Focal visual search pattern"*

---

### 8. Dataset and Training Data Status (Critical Honesty Declaration)
- **Current Dataset:** The current models are trained on a cleanly separated **demonstration synthetic dataset** ([`demo_dataset.py`](file:///c:/Users/gatle/Music/MindMap/backend/app/ml/demo_dataset.py)) generated exclusively to validate the end-to-end mathematical pipeline, tensor shapes, and serialization.
- **Academic Declaration:** No real-world accuracy, precision, or recall numbers are fabricated. Real dataset-based evaluation on benchmark affective corpora (such as DAiSEE) remains pending for Phase 3.
- **Drop-in Extensibility:** The function `temporal_vector_to_features()` defines the exact 15-dimensional input contract required for DAiSEE extracted features.

---

### 9. Current Limitations
1. **Single Workstation Student:** Tuned for one student per camera feed.
2. **Synthetic Demonstration Weights:** Real-world generalization will be finalized upon training on the full DAiSEE video corpus.
3. **Lighting Dependence:** MediaPipe landmark accuracy depends on ambient lighting, which is tracked via `valid_face_percentage`.
