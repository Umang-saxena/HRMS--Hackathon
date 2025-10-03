import pandas as pd
import xgboost as xgb
import joblib
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, classification_report, roc_auc_score,
    f1_score, recall_score
)

# --------------------------
# Data Loading
# --------------------------
def load_data(path):
    return pd.read_csv(path)

def split_features_target(df, target_col="Attrition", drop_cols=["EmployeeID"]):
    X = df.drop(columns=drop_cols + [target_col])
    y = df[target_col]
    return X, y

def build_preprocessor(X, categorical_features):
    numerical_features = X.select_dtypes(include=["int64", "float64"]).columns
    preprocessor = ColumnTransformer([
        ("num", "passthrough", numerical_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
    ])
    return preprocessor, numerical_features

# --------------------------
# Model & Hyperparameter Tuning
# --------------------------
def tune_model(preprocessor, scale_pos_weight, X_train, y_train):
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", xgb.XGBClassifier(
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            scale_pos_weight=scale_pos_weight
        ))
    ])

    param_dist = {
        "classifier__max_depth": [3, 5, 7, 9],
        "classifier__learning_rate": [0.01, 0.05, 0.1, 0.2],
        "classifier__n_estimators": [100, 200, 500, 800],
        "classifier__subsample": [0.6, 0.8, 1.0],
        "classifier__colsample_bytree": [0.6, 0.8, 1.0],
        "classifier__gamma": [0, 0.25, 0.5, 1],
        "classifier__min_child_weight": [1, 3, 5]
    }

    search = RandomizedSearchCV(
        pipeline,
        param_distributions=param_dist,
        n_iter=15,
        scoring="f1",
        cv=3,
        verbose=2,
        n_jobs=-1,
        random_state=42
    )

    search.fit(X_train, y_train)

    print("\n✅ Best Hyperparameters:")
    print(search.best_params_)
    return search.best_estimator_

# --------------------------
# Training & Threshold Search
# --------------------------
def train_and_find_threshold(model, X, y, thresholds=[0.3, 0.35, 0.4, 0.5], optimize_for="f1"):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Hyperparameter tuning
    model = tune_model(model.named_steps["preprocessor"], 
                       (y == 0).sum() / (y == 1).sum(),
                       X_train, y_train)

    y_proba = model.predict_proba(X_test)[:, 1]

    best_score, best_threshold = -1, 0.5
    for t in thresholds:
        y_pred = (y_proba >= t).astype(int)

        if optimize_for == "f1":
            score = f1_score(y_test, y_pred)
        elif optimize_for == "recall":
            score = recall_score(y_test, y_pred)
        else:
            score = accuracy_score(y_test, y_pred)

        if score > best_score:
            best_score, best_threshold = score, t

        acc = accuracy_score(y_test, y_pred)
        f1_val = f1_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_proba)
        print(f"\nThreshold {t}: Accuracy={acc:.4f}, F1={f1_val:.4f}, ROC-AUC={roc:.4f}")
        print(classification_report(y_test, y_pred))

    print(f"\n🔥 Best Threshold = {best_threshold} (Optimized for {optimize_for.upper()}, Score={best_score:.4f})")
    return model, best_threshold

# --------------------------
# Main Execution
# --------------------------
def main():
    df = load_data("data/synthetic_employee_data_final.csv")
    X, y = split_features_target(df)

    categorical_features = ["Department", "JobRole", "Gender", "MaritalStatus"]

    preprocessor, _ = build_preprocessor(X, categorical_features)
    scale_pos_weight = (y == 0).sum() / (y == 1).sum()

    dummy_model = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", xgb.XGBClassifier(
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            scale_pos_weight=scale_pos_weight
        ))
    ])

    trained_model, best_threshold = train_and_find_threshold(dummy_model, X, y)

    joblib.dump({"model": trained_model, "threshold": best_threshold},
                "models/xgb_attrition_synthetic.joblib")
    print("✅ Model saved at models/xgb_attrition_synthetic.joblib")

if __name__ == "__main__":
    main()
