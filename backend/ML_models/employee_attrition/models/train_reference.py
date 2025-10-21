import pandas as pd
import xgboost as xgb
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score, f1_score, confusion_matrix, recall_score
import joblib

def load_data(file_path):
    return pd.read_csv(file_path)

def split_features_target(df, target_col='LeftCompany', drop_cols=['EmployeeID']):
    X = df.drop(columns=drop_cols + [target_col])
    y = df[target_col]
    return X, y

def build_preprocessor(X, categorical_features):
    numerical_features = X.select_dtypes(include=['int64', 'float64']).columns
    preprocessor = ColumnTransformer([
        ('num', 'passthrough', numerical_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])
    return preprocessor, numerical_features

def build_model(preprocessor, scale_pos_weight):
    return Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', xgb.XGBClassifier(
            use_label_encoder=False,
            eval_metric='logloss',
            random_state=42,
            scale_pos_weight=scale_pos_weight
        ))
    ])

def train_and_find_best_threshold(model, X, y, thresholds=[0.3, 0.35, 0.4, 0.5], optimize_for="f1"):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model.fit(X_train, y_train)
    y_proba = model.predict_proba(X_test)[:, 1]

    best_score = -1
    best_threshold = 0.5
    best_report = None

    for t in thresholds:
        y_pred = (y_proba >= t).astype(int)

        if optimize_for == "f1":
            score = f1_score(y_test, y_pred)
        elif optimize_for == "recall":
            score = recall_score(y_test, y_pred)
        else:
            score = accuracy_score(y_test, y_pred)

        if score > best_score:
            best_score = score
            best_threshold = t
            best_report = classification_report(y_test, y_pred, output_dict=False)

        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_proba)
        print(f"\nThreshold {t}: Accuracy={acc:.4f}, F1={f1:.4f}, ROC-AUC={roc:.4f}")
        print(classification_report(y_test, y_pred))

    print(f"\n🔥 Best Threshold = {best_threshold} (Optimized for {optimize_for.upper()}, Score={best_score:.4f})")
    print("Classification Report @ Best Threshold:\n", best_report)

    cm = confusion_matrix(y_test, (y_proba >= best_threshold).astype(int))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["Stayed", "Left"], yticklabels=["Stayed", "Left"])
    plt.title(f"Confusion Matrix (Best Threshold={best_threshold})")
    plt.show()

    return model, best_threshold

def plot_feature_importance(model, numerical_features, categorical_features, top_n=15):
    feature_names = numerical_features.tolist() + \
        model.named_steps['preprocessor'].named_transformers_['cat'].get_feature_names_out(categorical_features).tolist()
    importance_scores = model.named_steps['classifier'].feature_importances_
    feature_importance = pd.DataFrame({'feature': feature_names, 'importance': importance_scores})
    feature_importance = feature_importance.sort_values('importance', ascending=False).head(top_n)
    plt.figure(figsize=(10, 8))
    plt.barh(feature_importance['feature'], feature_importance['importance'])
    plt.title(f'Top {top_n} Features for Attrition Prediction')
    plt.gca().invert_yaxis()
    plt.show()

def main():
    df = load_data('synthetic_employee_data_final.csv')
    X, y = split_features_target(df)
    categorical_features = ['Department', 'JobLevel', 'Gender', 'EducationLevel']
    preprocessor, numerical_features = build_preprocessor(X, categorical_features)
    scale_pos_weight = (y == 0).sum() / (y == 1).sum()
    model = build_model(preprocessor, scale_pos_weight)
    trained_model, best_threshold = train_and_find_best_threshold(model, X, y, optimize_for="f1")
    # inside train_reference.py (change save line)
    joblib.dump({"model": trained_model, "threshold": best_threshold}, 'models/attrition.joblib')

    print(f"✅ Model and threshold saved (threshold={best_threshold})")
    plot_feature_importance(trained_model, numerical_features, categorical_features)

if __name__ == "__main__":
    main()
