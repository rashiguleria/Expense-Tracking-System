import random
import pandas as pd
from datetime import datetime


users = list(range(1, 16))

# Monthly Base Salary (₹)
base_salary = {
    1: 75000,
    2: 60000,
    3: 42000,
    4: 90000,
    5: 50000,
    6: 70000,
    7: 55000,
    8: 65000,
    9: 58000,
    10: 68000,
    11: 72000,
    12: 45000,
    13: 62000,
    14: 85000,
    15: 53000,
    
}

# Extra Income Sources
extra_income = {
    1: "Freelancing",
    2: "Investment",
    3: "Scholarship",
    4: "Rental Income",
    5: "Bonus",
    6: "Business",
    7: "Interest",
    8: "Part-Time",
    9: "YouTube",
    10: "Stock Market",
    11: "Consulting",
    12: "Internship",
    13: "Affiliate Marketing",
    14: "Property Rent",
    15: "Online Store",
    
}

income_records = []
income_id = 1

for user_id in users:

    salary = base_salary[user_id]

    for month in range(1, 13):

        # Monthly salary variation
        salary_amount = salary + random.randint(-2000, 3000)

        salary_date = datetime(2025, month, 1).strftime("%Y-%m-%d")

        income_records.append({
            "income_id": income_id,
            "user_id": user_id,
            "amount": salary_amount,
            "income_date": salary_date,
            "source": "Salary"
        })

        income_id += 1

        # Festival Bonus (October & November)
        if month in [10, 11]:

            bonus = random.randint(5000, 25000)

            income_records.append({
                "income_id": income_id,
                "user_id": user_id,
                "amount": bonus,
                "income_date": datetime(2025, month, 20).strftime("%Y-%m-%d"),
                "source": "Festival Bonus"
            })

            income_id += 1

        # Performance Bonus (June & December)
        if month in [6, 12] and random.random() < 0.70:

            performance_bonus = random.randint(5000, 20000)

            income_records.append({
                "income_id": income_id,
                "user_id": user_id,
                "amount": performance_bonus,
                "income_date": datetime(2025, month, 25).strftime("%Y-%m-%d"),
                "source": "Performance Bonus"
            })

            income_id += 1

        # Extra Income (50% chance)
        if random.random() < 0.50:

            extra_amount = random.randint(3000, 25000)

            day = random.randint(5, 28)

            income_records.append({
                "income_id": income_id,
                "user_id": user_id,
                "amount": extra_amount,
                "income_date": datetime(2025, month, day).strftime("%Y-%m-%d"),
                "source": extra_income[user_id]
            })

            income_id += 1

# Create DataFrame
df = pd.DataFrame(income_records)

# Sort by User and Date
df = df.sort_values(by=["user_id", "income_date"])

# Save CSV
df.to_csv("dataset/income.csv", index=False)

print("Income Dataset Generated Successfully!")
print("Total Records:", len(df))
