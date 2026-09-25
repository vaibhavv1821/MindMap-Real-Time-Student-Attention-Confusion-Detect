"""
MindMap Phase 2 - Random Forest Model Training Pipeline

Trains lightweight, explainable Random Forest models for:
1. Student Attention Classification (ATTENTIVE vs INATTENTIVE)
2. Student Confusion Classification (NORMAL vs POSSIBLY_CONFUSED)

Uses scikit-learn. Consumes temporal feature vectors rather than raw images.
Models are saved with joblib into the app/ml/models directory.
"""

import os
import json
import joblib
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier
from app.ml.demo_dataset import generate_demonstration_dataset, FEATURE_NAMES

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
ATTENTION_MODEL_PATH = os.path.join(MODEL_DIR, "attention_rf.joblib")
CONFUSION_MODEL_PATH = os.path.join(MODEL_DIR, "confusion_rf.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")


def train_and_save_models(
    n_samples: int = 600,
    random_seed: int = 42,
) -> dict:
    """
    Trains and saves Random Forest models for technical demonstration and testing.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)

    # 1. Generate demonstration dataset
    X, y_attention, y_confusion, demo_meta = generate_demonstration_dataset(
        n_samples=n_samples, random_seed=random_seed
    )

    # 2. Train Attention Random Forest
    # Hyperparameters tuned for fast inference (<2ms) and explainability
    attention_rf = RandomForestClassifier(
        n_estimators=40,
        max_depth=5,
        min_samples_split=4,
        random_state=random_seed,
        n_jobs=-1,
    )
    attention_rf.fit(X, y_attention)

    # 3. Train Confusion Random Forest
    confusion_rf = RandomForestClassifier(
        n_estimators=40,
        max_depth=5,
        min_samples_split=4,
        random_state=random_seed,
        n_jobs=-1,
    )
    confusion_rf.fit(X, y_confusion)

    # 4. Save models with joblib
    joblib.dump(attention_rf, ATTENTION_MODEL_PATH)
    joblib.dump(confusion_rf, CONFUSION_MODEL_PATH)

    metadata = {
        "architecture": "RandomForestClassifier",
        "estimators": 40,
        "max_depth": 5,
        "feature_count": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "classes": {
            "attention": ["INATTENTIVE", "ATTENTIVE"],
            "confusion": ["NORMAL", "POSSIBLY_CONFUSED"],
        },
        "training_data": demo_meta["dataset_type"],
        "notice": "DEMONSTRATION MODEL FOR PIPELINE VALIDATION. DAiSEE DATASET INTEGRATION READY.",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    meta = train_and_save_models()
    print("==================================================================")
    print("[OK] MindMap Random Forest Models Successfully Trained & Saved!")
    print(f"  Attention Model : {ATTENTION_MODEL_PATH}")
    print(f"  Confusion Model : {CONFUSION_MODEL_PATH}")
    print(f"  Feature Schema  : {len(FEATURE_NAMES)} features")
    print(f"  Notice          : {meta['notice']}")
    print("==================================================================")
