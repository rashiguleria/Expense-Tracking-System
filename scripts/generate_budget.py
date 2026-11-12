import random
import pandas as pd

# 15 Users
users = list(range(1, 16))

# Categories
categories = {
    101: "Food",
    102: "Shopping",
    103: "Travel",
    104: "Bills",
    105: "Entertainment",
    106: "Healthcare",
    107: "Education",
    108: "Others",
    109: "Groceries",
    110: "Fuel",
    111: "Personal Care",
    112: "Gifts & Donations"
}

# Budget Range (₹)
category_budget = {
    101: (3000, 8000),
    102: (5000, 15000),
    103: (3000, 12000),
    104: (4000, 10000),
    105: (2000, 7000),
    106: (2000, 8000),
    107: (3000, 15000),
    108: (1000, 5000),
    109: (2500, 9000),
    110: (2000, 7000),
    111: (1500, 6000),
    112: (1000, 5000)
}

# User Budget Multiplier
user_multiplier = {
    1: 1.10,
    2: 1.00,
    3: 0.80,
    4: 1.30,
    5: 0.90,
    6: 1.15,
    7: 1.00,
    8: 1.05,
    9: 0.95,
    10: 1.10,
    11: 1.20,
    12: 0.85,
    13: 1.05,
    14: 1.35,
    15: 0.90
}

budget_records = []
budget_id = 1
year = 2025

for user in users:

    multiplier = user_multiplier[user]

    # Generate budget for every month
    for month in range(1, 13):

        for category in categories.keys():

            low, high = category_budget[category]

            # Small monthly variation (±10%)
            monthly_limit = int(
                random.randint(low, high)
                * multiplier
                * random.uniform(0.90, 1.10)
            )

            budget_records.append({
                "budget_id": budget_id,
                "user_id": user,
                "category_id": category,
                "monthly_limit": monthly_limit,
                "month": month,
                "year": year
            })

            budget_id += 1

# Create DataFrame
df = pd.DataFrame(budget_records)

# Sort data
df = df.sort_values(
    by=["user_id", "year", "month", "category_id"]
)

# Save CSV
df.to_csv("dataset/budget.csv", index=False)

print("Budget Dataset Generated Successfully!")
print("Total Records:", len(df))