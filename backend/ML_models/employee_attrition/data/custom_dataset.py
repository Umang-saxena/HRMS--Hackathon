import pandas as pd
import numpy as np

# --------------------------
# Configuration
# --------------------------
NUM_EMPLOYEES = 15000
TARGET_ATTRITION_RATE = 0.16  # ~16%

# --------------------------
# Step 1: Generate Core Features
# --------------------------
data = {
    "EmployeeID": range(1, NUM_EMPLOYEES + 1),

    # 👥 Demographics
    "Age": np.clip(np.random.normal(loc=35, scale=8, size=NUM_EMPLOYEES), 22, 60).astype(int),
    "Gender": np.random.choice(["Male", "Female"], size=NUM_EMPLOYEES, p=[0.5, 0.5]),
    "MaritalStatus": np.random.choice(["Single", "Married", "Divorced"], size=NUM_EMPLOYEES, p=[0.45, 0.45, 0.10]),

    # 💼 Job-related
    "Department": np.random.choice(["Engineering", "Sales", "HR", "Marketing"], size=NUM_EMPLOYEES, p=[0.4, 0.3, 0.1, 0.2]),
    "JobRole": np.random.choice(["Junior", "Mid-Level", "Senior", "Manager"], size=NUM_EMPLOYEES, p=[0.4, 0.3, 0.2, 0.1]),
    "YearsAtCompany": np.random.randint(1, 84, size=NUM_EMPLOYEES),
    "YearsSinceLastPromotion": np.random.randint(0, 10, size=NUM_EMPLOYEES),

    # 💰 Compensation
    "MonthlyIncome": np.random.randint(40000, 160000, size=NUM_EMPLOYEES),

    # 💡 Engagement & Performance
    "WorkLifeBalance": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.2, 0.3, 0.3, 0.2]),
    "JobSatisfaction": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.25, 0.25, 0.25, 0.25]),
    "PerformanceRating": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.1, 0.2, 0.4, 0.3]),

    # 🏡 Lifestyle & Mobility
    "CommuteDistance": np.random.randint(1, 50, size=NUM_EMPLOYEES),
    "NumberOfCompaniesWorked": np.random.randint(1, 10, size=NUM_EMPLOYEES),
}

df = pd.DataFrame(data)

# --------------------------
# Step 2: Normalize Key Risk Factors
# --------------------------
norm_performance = 1 - (df["PerformanceRating"] / 4.0)
norm_tenure = abs(df["YearsAtCompany"] - 36) / 36
norm_promotion = df["YearsSinceLastPromotion"] / df["YearsSinceLastPromotion"].max()
norm_commute = df["CommuteDistance"] / df["CommuteDistance"].max()
norm_age = abs(df["Age"] - 40) / 40
norm_job_satisfaction = 1 - (df["JobSatisfaction"] / 4.0)
norm_wlb = 1 - (df["WorkLifeBalance"] / 4.0)

# Add random noise to simulate unobserved factors
noise = np.random.normal(0, 0.05, size=NUM_EMPLOYEES)

# --------------------------
# Step 3: Weighted Attrition Risk Formula
# --------------------------
df["probability_to_leave"] = (
    0.23 * norm_promotion +         # career stagnation
    0.20 * norm_job_satisfaction +  # job unhappiness
    0.17 * norm_wlb +               # poor work-life balance
    0.20 * norm_performance +       # low engagement
    0.05 * norm_tenure +            # tenure extremes
    0.08 * norm_commute +           # long commute
    0.07 * norm_age +               # younger = more mobile
    noise
)

# 
# Step 4: Assign Attrition Labels
# 
num_leavers = int(NUM_EMPLOYEES * TARGET_ATTRITION_RATE)
attrition_threshold = df["probability_to_leave"].nlargest(num_leavers).iloc[-1]
df["Attrition"] = (df["probability_to_leave"] >= attrition_threshold).astype(int)

# Clean up
df = df.drop(columns=["probability_to_leave"])

# 
# Step 5: Export Dataset

print(f"Final Attrition Rate: {df['Attrition'].mean():.2%}")
df.to_csv("synthetic_employee_data_final.csv", index=False)
print("\nSuccessfully generated simplified synthetic_employee_data_final.csv")
