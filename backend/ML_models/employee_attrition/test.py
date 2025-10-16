import requests
import json

# ------------------------------------------------
# API endpoint
# ------------------------------------------------
URL = "http://127.0.0.1:8000/predict_attrition/"

# ------------------------------------------------
# Example 1: High attrition risk (likely to leave)
# ------------------------------------------------
employee_high_attrition = {
    "Age": 27,
    "Gender": "Male",
    "MaritalStatus": "Single",
    "Department": "Sales",
    "JobRole": "Junior",
    "YearsAtCompany": 2,
    "YearsSinceLastPromotion": 5,
    "MonthlyIncome": 42000,
    "WorkLifeBalance": 1,
    "JobSatisfaction": 1,
    "PerformanceRating": 2,
    "CommuteDistance": 45,
    "NumberOfCompaniesWorked": 6
}

# ------------------------------------------------
# Example 2: Low attrition risk (likely to stay)
# ------------------------------------------------
employee_low_attrition = {
    "Age": 45,
    "Gender": "Female",
    "MaritalStatus": "Married",
    "Department": "Engineering",
    "JobRole": "Senior",
    "YearsAtCompany": 12,
    "YearsSinceLastPromotion": 1,
    "MonthlyIncome": 150000,
    "WorkLifeBalance": 4,
    "JobSatisfaction": 4,
    "PerformanceRating": 4,
    "CommuteDistance": 8,
    "NumberOfCompaniesWorked": 2
}

# ------------------------------------------------
# Function to call API and display results
# ------------------------------------------------
def test_prediction(employee_data, description):
    print(f"\n🧑 Testing: {description}")
    try:
        response = requests.post(URL, json=employee_data)
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=4))
        else:
            print(f"❌ Request failed with status code {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print("⚠️ Could not connect to API. Make sure 'serve.py' is running.")


# ------------------------------------------------
# Run both tests
# ------------------------------------------------
if __name__ == "__main__":
    test_prediction(employee_high_attrition, "High Attrition Risk Employee")
    test_prediction(employee_low_attrition, "Low Attrition Risk Employee")
