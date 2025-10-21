# serve.py
from fastapi import FastAPI, HTTPException
import joblib
import pandas as pd
import os
import traceback
import json

# DB optional
DB_URL = os.getenv("DATABASE_URL")  # e.g. postgres://user:pass@host:port/dbname
USE_DB = bool(DB_URL)

if USE_DB:
    import psycopg2
    from psycopg2.extras import Json

MODEL_PATH = os.getenv("MODEL_PATH", "models/attrition.joblib")
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0")

app = FastAPI(title="HRMS Attrition Prediction API")

# load model once
try:
    saved = joblib.load(MODEL_PATH)
    model = saved["model"]
    threshold = float(saved.get("threshold", 0.5))
    print(f"Loaded model from {MODEL_PATH}; threshold={threshold}")
except Exception as e:
    print("Error loading model:", e)
    model = None
    threshold = 0.5

@app.get("/")
def root():
    return {"message": "HRMS Attrition Prediction API is running 🚀", "model_loaded": model is not None, "model_version": MODEL_VERSION}

@app.post("/predict_attrition/")
def predict_attrition(employee: dict):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # convert to dataframe with one row
        df = pd.DataFrame([employee])

        # If your model pipeline expects certain columns / dtypes, ensure they exist/are casted here
        # Example: df = df.astype({ 'Age': int, ...})  # adapt if necessary

        proba = float(model.predict_proba(df)[:, 1][0])
        pred_bool = bool(proba >= threshold)
        label = "high" if proba >= 0.75 else "medium" if proba >= 0.5 else "low"

        # Build a small explainability snippet (feature importances)
        reason = {"note": "explainability unavailable"}
        try:
            # only works if your pipeline keeps `classifier` and preprocessor names same as training script
            import numpy as np
            fi = model.named_steps['classifier'].feature_importances_
            cat = model.named_steps['preprocessor'].named_transformers_.get('cat', None)
            cat_names = []
            if cat is not None and hasattr(cat, "get_feature_names_out"):
                # depends on sklearn version
                cat_names = list(cat.get_feature_names_out())
            # numeric feature names — attempt to derive from df and transformer
            num_names = list(df.select_dtypes(include=['int64', 'float64']).columns)
            feature_names = num_names + cat_names
            top_idx = np.argsort(fi)[-5:][::-1]
            top_feats = []
            for i in top_idx:
                if i < len(feature_names):
                    top_feats.append({"feature": feature_names[i], "importance": float(fi[i])})
            reason = {"top_features": top_feats}
        except Exception:
            # ignore explain errors
            pass

        result = {
            "attrition_probability": proba,
            "attrition_prediction": int(pred_bool),
            "threshold_used": threshold,
            "label": label,
            "reason": reason,
            "model_version": MODEL_VERSION
        }

        # upsert into DB if configured and EmployeeID provided
        if USE_DB:
            emp_id = employee.get("EmployeeID") or employee.get("id") or None
            if emp_id:
                try:
                    conn = psycopg2.connect(DB_URL)
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO attrition_predictions (employee_id, score, prediction, label, reason, model_version, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, now())
                        ON CONFLICT (employee_id) DO UPDATE
                        SET score = EXCLUDED.score,
                            prediction = EXCLUDED.prediction,
                            label = EXCLUDED.label,
                            reason = EXCLUDED.reason,
                            model_version = EXCLUDED.model_version,
                            updated_at = now();
                    """, (
                        emp_id,
                        float(proba),
                        pred_bool,
                        label,
                        Json(result.get("reason")),
                        MODEL_VERSION
                    ))
                    conn.commit()
                    cur.close()
                    conn.close()
                except Exception as e:
                    # log but don't fail the request
                    print("DB upsert failed:", e)
                    traceback.print_exc()

        return result

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
