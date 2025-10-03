import pandas as pd
import joblib
from sklearn.metrics import (
    accuracy_score, classification_report, roc_auc_score,
    f1_score, recall_score
)

def load_test_data(file_path):
    df = pd.read_csv(file_path)
    df['Attrition'] = df['Attrition'].map({'Stayed': 0, 'Left': 1})
    X = df.drop(columns=['Employee ID', 'Attrition'])
    y = df['Attrition']
    return X, y

def evaluate_model(model_bundle, X, y):
    model = model_bundle["model"]
    threshold = model_bundle["threshold"]

    y_proba = model.predict_proba(X)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)

    acc = accuracy_score(y, y_pred)
    f1 = f1_score(y, y_pred)
    recall = recall_score(y, y_pred)
    roc = roc_auc_score(y, y_proba)

    print("📊 Final Evaluation on Test Set")
    print(f"Accuracy       : {acc:.4f}")
    print(f"F1 Score       : {f1:.4f}")
    print(f"Recall         : {recall:.4f}")
    print(f"ROC-AUC        : {roc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y, y_pred))

def main():
    # Load model + threshold
    model_bundle = joblib.load("models/attrition.joblib")

    # Load test.csv
    X_test, y_test = load_test_data("data/test.csv")

    # Evaluate
    evaluate_model(model_bundle, X_test, y_test)

if __name__ == "__main__":
    main()
