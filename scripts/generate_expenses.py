import random
import pandas as pd
from datetime import datetime, timedelta


users = list(range(1, 16))


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

payment_modes = ["UPI", "Card", "Cash"]


merchants = {
    101: ["Zomato", "Swiggy", "Domino's", "McDonald's", "KFC"],
    102: ["Amazon", "Flipkart", "Myntra", "Reliance Trends", "DMart"],
    103: ["Uber", "Ola", "IRCTC", "RedBus"],
    104: ["Electricity Board", "Jio", "Airtel", "HP Gas"],
    105: ["PVR Cinema", "Netflix", "BookMyShow", "Spotify"],
    106: ["Apollo Pharmacy", "MedPlus", "Fortis Hospital"],
    107: ["Coursera", "Udemy", "College Fee", "Book Store"],
    108: ["Local Store", "Gift Shop", "Stationery"],
    109: ["Big Bazaar", "DMart", "Reliance Fresh", "More Supermarket"],
    110: ["Indian Oil", "HP Petrol Pump", "Bharat Petroleum", "Shell"],
    111: ["Nykaa", "Lakme", "Health & Glow", "Apollo Pharmacy"],
    112: ["Gift Store", "Archies", "Flower Shop", "NGO Donation"]
}

# User Spending Profiles
user_profiles = {
    1: [101,101,101,102,102,102,102,105,105,109,103,104,106,107,108,110,111,112],
    2: [103,103,103,103,104,104,104,101,102,105,106,107,108,109,110,111,112],
    3: [107,107,107,107,102,102,101,103,104,105,106,108,109,110,111,112],
    4: [106,106,106,106,104,104,101,102,103,105,107,108,109,110,111,112],
    5: [104,104,104,104,101,109,110,102,103,105,106,107,108,111,112],
    6: [105,105,105,105,102,102,101,103,104,106,107,108,109,110,111,112],
    7: [101,102,103,104,105,106,107,108,109,110,111,112],
    8: [101,101,101,104,104,108,109,102,103,105,106,107,110,111,112],
    9: [109,109,109,110,110,101,102,103,104,105,106,107,108,111,112],
    10:[102,102,102,105,105,111,101,103,104,106,107,108,109,110,112],
    11:[103,103,103,110,110,104,101,102,105,106,107,108,109,111,112],
    12:[106,106,101,109,109,102,103,104,105,107,108,110,111,112],
    13:[107,107,102,111,111,101,103,104,105,106,108,109,110,112],
    14:[103,103,112,112,108,101,102,104,105,106,107,109,110,111],
    15:[104,104,109,109,110,101,102,103,105,106,107,108,111,112],
    
}

# Number of Expense Records
num_records = 2700

expenses = []

start_date = datetime(2025, 1, 1)
end_date = datetime(2025, 12, 31)

for expense_id in range(1, num_records + 1):

    user_id = random.choice(users)

    category_id = random.choice(user_profiles[user_id])


    # Amount based on Category

    if category_id == 101:
        amount = random.randint(100, 1000)

    elif category_id == 102:
        amount = random.randint(500, 8000)

    elif category_id == 103:
        amount = random.randint(300, 10000)

    elif category_id == 104:
        amount = random.randint(500, 5000)

    elif category_id == 105:
        amount = random.randint(200, 4000)

    elif category_id == 106:
        amount = random.randint(200, 7000)

    elif category_id == 107:
        amount = random.randint(500, 15000)

    elif category_id == 108:
        amount = random.randint(100, 3000)

    elif category_id == 109:
        amount = random.randint(500, 6000)

    elif category_id == 110:
        amount = random.randint(1000, 8000)

    elif category_id == 111:
        amount = random.randint(300, 5000)

    elif category_id == 112:
        amount = random.randint(200, 4000)

    else:
        amount = random.randint(100, 3000)

    payment_mode = random.choice(payment_modes)

    merchant = random.choice(merchants[category_id])

    random_days = random.randint(0, (end_date - start_date).days)

    expense_date = start_date + timedelta(days=random_days)

    expenses.append({
        "expense_id": expense_id,
        "user_id": user_id,
        "category_id": category_id,
        "amount": amount,
        "expense_date": expense_date.strftime("%Y-%m-%d"),
        "payment_mode": payment_mode,
        "merchant": merchant
    })

# Create DataFrame
df = pd.DataFrame(expenses)

# Sort by User and Date
df = df.sort_values(by=["user_id", "expense_date"])

# Save CSV
df.to_csv("dataset/expenses.csv", index=False)


print("Expenses Dataset Generated Successfully!")
print("Total Records:", len(df))
