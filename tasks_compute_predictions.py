# tasks_compute_predictions.py
import os
import requests
import json
from celery_worker import celery_app   # shim at repo root exports celery_app
import psycopg2

DB_URL = os.getenv("DATABASE_URL")
SERVE_URL = os.getenv("SERVE_URL", "http://127.0.0.1:8000/predict_attrition/")  # change for prod to internal service url

@celery_app.task(name="compute_all_attrition_predictions")
def compute_all_predictions():
    if not DB_URL:
        print("DATABASE_URL not set; aborting compute_all_predictions")
        return

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    # SELECT the columns you need for the model. Replace with your actual column names.
    cur.execute("""
      SELECT id, age, gender, maritalstatus, department, jobrole, yearsatcompany,
             yearssincelastpromotion, monthlyincome, worklifebalance, jobsatisfaction,
             performancerating, commutedistance, numberofcompaniesworked
      FROM employees
      WHERE active = true;
    """)
    rows = cur.fetchall()
    # adapt column order above to how you build the payload
    for r in rows:
        emp_id = str(r[0])
        payload = {
            "EmployeeID": emp_id,
            "Age": r[1],
            "Gender": r[2],
            "MaritalStatus": r[3],
            "Department": r[4],
            "JobRole": r[5],
            "YearsAtCompany": r[6],
            "YearsSinceLastPromotion": r[7],
            "MonthlyIncome": r[8],
            "WorkLifeBalance": r[9],
            "JobSatisfaction": r[10],
            "PerformanceRating": r[11],
            "CommuteDistance": r[12],
            "NumberOfCompaniesWorked": r[13]
        }
        try:
            resp = requests.post(SERVE_URL, json=payload, timeout=20)
            if resp.status_code != 200:
                print(f"Predict failed for {emp_id}: {resp.status_code} {resp.text}")
            else:
                print(f"Predicted {emp_id}: {resp.json().get('attrition_probability'):.3f}")
        except Exception as e:
            print("Request exception for", emp_id, e)

    cur.close()
    conn.close()
