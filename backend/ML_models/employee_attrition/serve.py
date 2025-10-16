from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()

saved = joblib.load("models/attrition.joblib")
model = saved["model"]
threshold = saved["threshold"]

@app.get("/")
def root():
    return {"message": "HRMS Attrition Prediction API is running 🚀"}

@app.post("/predict_attrition/")
def predict_attrition(employee: dict):
    df = pd.DataFrame([employee])
    proba = model.predict_proba(df)[:, 1][0]
    pred = int(proba >= threshold)
    return {
        "attrition_probability": float(proba),
        "attrition_prediction": pred,
        "threshold_used": threshold
    }
