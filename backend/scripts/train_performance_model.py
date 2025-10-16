# backend/scripts/train_performance_model.py
"""
Usage:
  cd backend
  .venv\Scripts\activate  # windows
  pip install -r requirements.txt  # ensure sklearn, pandas, joblib added
  python scripts/train_performance_model.py
"""
import os
import pandas as pd
from app.supabase_client import supabase
from app.performance.utils import extract_data
from app.performance.ml_model import train_supervised, train_unsupervised
import getpass
import json

# Fetch performance_metrics from Supabase
def fetch_metrics():
    res = supabase.table("performance_metrics").select("*").execute()
    data = extract_data(res) or []
    df = pd.DataFrame(data)
    return df

def main():
    print("Fetching metrics from Supabase...")
    df = fetch_metrics()
    if df.empty:
        print("No metrics found. Run compute-metrics endpoint or seed data before training.")
        return
    # Check if a 'label' column exists; if not, we'll run unsupervised
    if "label" in df.columns:
        print("Found labels -> running supervised training")
        # pick features - ensure numeric columns exist
        feature_cols = ["tasks_assigned", "tasks_completed", "avg_task_completion_days", "attendance_rate"]
        df_feat = df[feature_cols + ["label"]].dropna()
        meta = train_supervised(df_feat, label_col="label")
    else:
        print("No label column -> running unsupervised training (IsolationForest)")
        feature_cols = ["tasks_assigned", "tasks_completed", "avg_task_completion_days", "attendance_rate"]
        df_feat = df[feature_cols].fillna(0)
        meta = train_unsupervised(df_feat)
    print("Training finished. Meta:", meta)
    # Persist model metadata to Supabase table ml_models
    model_record = {
        "name": "performance_model",
        "version": meta.get("trained_at", ""),
        "model_path": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "models", "perf_model.pkl")),
        "notes": json.dumps(meta.get("metrics", {})),
        "metrics": meta.get("metrics", {})
    }
    supabase.table("ml_models").insert(model_record).execute()
    print("Model metadata saved to ml_models table.")

if __name__ == "__main__":
    main()
