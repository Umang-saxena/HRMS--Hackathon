import pandas as pd
import numpy as np

# Number of employees and target attrition rate
NUM_EMPLOYEES = 5000
TARGET_ATTRITION_RATE = 0.16  # ~16%

# --------------------------
# Step 1: Generate Features
# --------------------------
data = {
    "EmployeeID": range(1, NUM_EMPLOYEES + 1),

    # Core demographics
    "Age": np.clip(np.random.normal(loc=35, scale=8, size=NUM_EMPLOYEES), 22, 60).astype(int),
    "Gender": np.random.choice(["Male", "Female"], size=NUM_EMPLOYEES, p=[0.5, 0.5]),
    "MaritalStatus": np.random.choice(["Single", "Married", "Divorced"], size=NUM_EMPLOYEES, p=[0.4, 0.5, 0.1]),

    # Job-related
    "Department": np.random.choice(["Engineering", "Sales", "HR", "Marketing"], size=NUM_EMPLOYEES, p=[0.4, 0.3, 0.1, 0.2]),
    "JobRole": np.random.choice(["Junior", "Mid-Level", "Senior", "Manager"], size=NUM_EMPLOYEES, p=[0.4, 0.3, 0.2, 0.1]),
    "JobLevel": np.random.randint(1, 6, size=NUM_EMPLOYEES),
    "YearsAtCompany": np.random.randint(1, 84, size=NUM_EMPLOYEES),
    "YearsInCurrentRole": np.random.randint(0, 20, size=NUM_EMPLOYEES),
    "YearsSinceLastPromotion": np.random.randint(0, 10, size=NUM_EMPLOYEES),

    # Compensation
    "MonthlyIncome": np.random.randint(40000, 160000, size=NUM_EMPLOYEES),
    "HourlyRate": np.random.randint(15, 120, size=NUM_EMPLOYEES),

    # Work behavior
    "OvertimeHoursPerMonth": np.random.randint(0, 50, size=NUM_EMPLOYEES),
    "ProjectCount": np.random.randint(1, 10, size=NUM_EMPLOYEES),
    "AverageHoursWorkedPerWeek": np.random.randint(30, 70, size=NUM_EMPLOYEES),
    "Absenteeism": np.random.randint(0, 20, size=NUM_EMPLOYEES),

    # Engagement factors
    "WorkLifeBalance": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.2, 0.3, 0.3, 0.2]),
    "JobSatisfaction": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.25, 0.25, 0.25, 0.25]),
    "PerformanceRating": np.random.choice([1, 2, 3, 4], size=NUM_EMPLOYEES, p=[0.1, 0.2, 0.4, 0.3]),
    "TrainingHoursLastYear": np.random.randint(0, 100, size=NUM_EMPLOYEES),

    # Mobility
    "CommuteDistance": np.random.randint(1, 50, size=NUM_EMPLOYEES),
    "NumberOfCompaniesWorked": np.random.randint(1, 10, size=NUM_EMPLOYEES),
}

df = pd.DataFrame(data)

# --------------------------
# Step 2: Risk Normalization
# --------------------------
norm_performance = 1 - (df["PerformanceRating"] / 4.0)
norm_tenure = abs(df["YearsAtCompany"] - 36) / 36
norm_promotion = df["YearsSinceLastPromotion"] / df["YearsSinceLastPromotion"].max()
norm_overtime = df["OvertimeHoursPerMonth"] / df["OvertimeHoursPerMonth"].max()
norm_commute = df["CommuteDistance"] / df["CommuteDistance"].max()
norm_age = abs(df["Age"] - 40) / 40
norm_job_satisfaction = 1 - (df["JobSatisfaction"] / 4.0)
norm_wlb = 1 - (df["WorkLifeBalance"] / 4.0)

# Add randomness (unobserved factors)
noise = np.random.normal(0, 0.05, size=NUM_EMPLOYEES)

# --------------------------
# Step 3: Weighted Risk Score
# --------------------------
df["probability_to_leave"] = (
    0.20 * norm_promotion +
    0.15 * norm_performance +
    0.15 * norm_overtime +
    0.10 * norm_commute +
    0.10 * norm_age +
    0.10 * norm_job_satisfaction +
    0.10 * norm_wlb +
    0.10 * norm_tenure +
    noise
)

# --------------------------
# Step 4: Assign Attrition
# --------------------------
num_leavers = int(NUM_EMPLOYEES * TARGET_ATTRITION_RATE)
attrition_threshold = df["probability_to_leave"].nlargest(num_leavers).iloc[-1]
df["Attrition"] = (df["probability_to_leave"] >= attrition_threshold).astype(int)

# Drop intermediate
df = df.drop(columns=["probability_to_leave"])

# --------------------------
# Step 5: Save Dataset
# --------------------------
print(f"Final Attrition Rate: {df['Attrition'].mean():.2%}")
df.to_csv("synthetic_employee_data_final.csv", index=False)
print("\n✅ Successfully generated synthetic_employee_data_final.csv")
