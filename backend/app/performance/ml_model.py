# backend/app/performance/ml_model.py
import os
import json
import joblib
from datetime import datetime
from typing import Dict, Any, Tuple

import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = os.path.join(BASE_DIR, "perf_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "perf_scaler.pkl")
META_PATH = os.path.join(BASE_DIR, "perf_meta.json")
os.makedirs(BASE_DIR, exist_ok=True)

def train_supervised(df: pd.DataFrame, label_col: str = "label", model_params: dict = None):
    if model_params is None:
        model_params = {"n_estimators": 200, "random_state": 42, "max_depth": 6}
    X = df.drop(columns=[label_col])
    y = df[label_col].astype(int)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(Xs, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(**model_params)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None
    report = classification_report(y_test, preds, output_dict=True)
    roc = roc_auc_score(y_test, proba) if proba is not None and len(set(y_test)) > 1 else None
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    meta = {"trained_at": datetime.utcnow().isoformat(), "metrics": {"report": report, "roc_auc": roc}}
    with open(META_PATH, "w") as f:
        json.dump(meta, f, default=str)
    return meta

def train_unsupervised(df: pd.DataFrame):
    scaler = StandardScaler()
    Xs = scaler.fit_transform(df)
    iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    iso.fit(Xs)
    joblib.dump(iso, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    meta = {"trained_at": datetime.utcnow().isoformat(), "method": "isolation_forest"}
    with open(META_PATH, "w") as f:
        json.dump(meta, f, default=str)
    return meta

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("No model found. Train first.")
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH) if os.path.exists(SCALER_PATH) else None
    meta = {}
    if os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            meta = json.load(f)
    return {"model": model, "scaler": scaler, "meta": meta}

def predict_risk(model_bundle: Dict[str, Any], features: Dict[str, Any]) -> Tuple[float, str]:
    model = model_bundle["model"]
    scaler = model_bundle.get("scaler")
    # features -> DataFrame row
    df = pd.DataFrame([features])
    if scaler is not None:
        Xs = scaler.transform(df)
    else:
        Xs = df.values
    if hasattr(model, "predict_proba"):
        score = float(model.predict_proba(Xs)[:, 1][0])
        label = "AT_RISK" if score > 0.6 else ("WARNING" if score > 0.4 else "OK")
        return score, label
    if hasattr(model, "decision_function"):
        val = float(model.decision_function(Xs)[0])
        import math
        score = 1 / (1 + math.exp(-val))
        label = "AT_RISK" if score > 0.6 else ("WARNING" if score > 0.4 else "OK")
        return score, label
    pred = model.predict(Xs)[0]
    score = float(pred)
    label = "AT_RISK" if pred == 1 else "OK"
    return score, label
