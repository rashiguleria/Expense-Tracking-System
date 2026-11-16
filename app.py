import logging
import os
import time
import traceback
import subprocess
import threading
import webbrowser


from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
import mysql.connector

import db

app = Flask(__name__)
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS",
        "https://expenses-tracking-system-frontend-ju2d.onrender.com,"
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8081,http://localhost:8081",
    ).split(",")
    if origin.strip()
]
CORS(app, origins=allowed_origins)

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)


def get_db_connection():
    attempts = 0
    while attempts < 3:
        try:
            connection = db.connect()
            connection.ping(reconnect=True, attempts=3, delay=1)
            return connection
        except mysql.connector.Error as exc:
            attempts += 1
            logger.exception("MySQL connection attempt %s failed", attempts)
            if attempts >= 3:
                raise exc
            time.sleep(1)

    raise RuntimeError("Unable to establish MySQL connection")


try:
    db.init_database()
except Exception:
    logger.exception("Database initialisation failed; check DB_* / DATABASE_URL settings")


@app.errorhandler(Exception)
def handle_exception(error):
    if isinstance(error, HTTPException):
        return jsonify({"error": error.description or error.name}), error.code

    logger.exception("Unhandled exception while processing request")
    return jsonify({"error": "Internal server error"}), 500


@app.route("/")
def home():
    return "Expense Tracking System Backend is Running!"


#-----------login----------
from flask import request

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json

    email = data.get("email")
    password = data.get("password")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            user_id,
            full_name,
            email
        FROM users
        WHERE email=%s AND password=%s
        LIMIT 1
    """, (email, password))

    user = cursor.fetchone()

    cursor.close()
    connection.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "success": True,
        "user": user
    })


#-----------users--------
@app.route("/api/users")
def users():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            user_id,
            full_name,
            email,
            password
        FROM users
        ORDER BY user_id
    """)

    users = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify([
        {
            "id": u["user_id"],
            "name": u["full_name"],
            "email": u["email"],
            "password": u["password"],
        }
        for u in users
    ])




# ----------------1. Dashboard API ----------------

@app.route("/api/dashboard")
def dashboard():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Total Users
        cursor.execute("""
            SELECT COUNT(*) AS total_users
            FROM users
        """)
        total_users = cursor.fetchone()["total_users"]


        # Total Demo Expense
        cursor.execute("""
            SELECT IFNULL(SUM(amount),0) AS total_expense
            FROM demo_expenses
        """)
        total_expense = cursor.fetchone()["total_expense"]


        # Total Demo Income
        cursor.execute("""
            SELECT IFNULL(SUM(amount),0) AS total_income
            FROM demo_income
        """)
        total_income = cursor.fetchone()["total_income"]


        # Average Expense
        cursor.execute("""
            SELECT ROUND(IFNULL(AVG(amount),0),2) AS average_expense
            FROM demo_expenses
        """)
        average_expense = cursor.fetchone()["average_expense"]


        #-----Highest Spender------
        cursor.execute("""
            SELECT
                u.full_name,
                SUM(e.amount) AS total
            FROM demo_expenses e
            JOIN users u
            ON e.user_id=u.user_id
            GROUP BY u.user_id,u.full_name
            ORDER BY total DESC
            LIMIT 1
        """)

        highest_spender = cursor.fetchone()


        return jsonify({

            "total_users": total_users,

            "total_expense": float(total_expense),

            "total_income": float(total_income),

            "average_expense": float(average_expense),

            "highest_spender": highest_spender
        })


    except Exception as exc:

        traceback.print_exc()

        return jsonify({
            "error":str(exc)
        }),500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

#------2. expenses------
@app.route("/api/user-expenses")
def user_expenses():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                u.user_id,
                u.full_name,
                SUM(e.amount) AS total_expense
            FROM users u
            JOIN demo_expenses e
            ON u.user_id = e.user_id
            GROUP BY u.user_id, u.full_name
            ORDER BY total_expense DESC
        """)

        data = cursor.fetchall()
        return jsonify(data)
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user-expenses")
        return jsonify({"error": "Failed to fetch user expenses", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#------3.user summary-----

@app.route("/api/user/<int:user_id>/summary")
def user_summary(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                IFNULL(SUM(amount),0) AS total_income
            FROM demo_income
            WHERE user_id=%s
        """, (user_id,))
        total_income = cursor.fetchone()["total_income"]

        cursor.execute("""
            SELECT
                IFNULL(SUM(amount),0) AS total_expense
            FROM demo_expenses
            WHERE user_id=%s
        """, (user_id,))
        total_expense = cursor.fetchone()["total_expense"]

        cursor.execute("""
            SELECT
                IFNULL(SUM(monthly_limit),0) AS total_budget
            FROM demo_budget
            WHERE user_id=%s
        """, (user_id,))
        total_budget = cursor.fetchone()["total_budget"]

        return jsonify({
            "user_id": user_id,
            "total_income": total_income,
            "total_expense": total_expense,
            "total_budget": total_budget,
            "savings": total_income - total_expense
        })
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/summary", user_id)
        return jsonify({"error": "Failed to fetch user summary", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#-----4.yearly spending-----

@app.route("/api/user/<int:user_id>/yearly")
def yearly(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                MONTHNAME(expense_date) AS month,
                MONTH(expense_date) AS month_no,
                MAX(YEAR(expense_date)) AS year,
                SUM(amount) AS total
            FROM demo_expenses
            WHERE user_id=%s
            GROUP BY MONTH(expense_date),MONTHNAME(expense_date)
            ORDER BY month_no
        """, (user_id,))

        data = cursor.fetchall()
        return jsonify(data)
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/yearly", user_id)
        return jsonify({"error": "Failed to fetch yearly spending", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#---5. monthly category spending-----

@app.route("/api/user/<int:user_id>/month/<int:month>")
def monthly(user_id, month):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        
        cursor.execute("""
            SELECT
            c.category_name,
            SUM(e.amount) total
            FROM demo_expenses e
            JOIN categories c
            ON e.category_id=c.category_id
            WHERE e.user_id=%s
            AND MONTH(expense_date)=%s
            GROUP BY c.category_name
            ORDER BY total DESC
            """,(user_id, month ))

        data = cursor.fetchall()
        return jsonify(data)
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/month/%s", user_id, month)
        return jsonify({"error": "Failed to fetch monthly spending", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#-----monthly category spending by year-----
@app.route("/api/user/<int:user_id>/month/<int:month>/categories")
def monthly_categories_by_year(user_id, month):
    year = request.args.get("year", type=int)
    if month < 0 or month > 11 or year is None or year < 1:
        return jsonify({"error": "A valid month and year are required"}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                c.category_name,
                SUM(e.amount) AS total
            FROM demo_expenses e
            JOIN categories c ON e.category_id = c.category_id
            WHERE e.user_id=%s
              AND YEAR(e.expense_date)=%s
              AND MONTH(e.expense_date)=%s
            GROUP BY c.category_name
            ORDER BY total DESC
        """, (user_id, year, month + 1))

        return jsonify({
            "user_id": user_id,
            "month": month,
            "year": year,
            "categories": cursor.fetchall(),
        })
    except Exception as exc:
        logger.exception("Error in category breakdown for user %s, month %s, year %s", user_id, month, year)
        return jsonify({"error": "Failed to fetch monthly category spending", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#----6. merchant wise spending-----

@app.route("/api/user/<int:user_id>/merchant")
def merchant(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
        SELECT
            merchant,
            SUM(amount) total
        FROM demo_expenses
        WHERE user_id=%s
        GROUP BY merchant
        ORDER BY total DESC
        """, (user_id,))

        data = cursor.fetchall()
        return jsonify(data)
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/merchant", user_id)
        return jsonify({"error": "Failed to fetch merchant spending", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#----7.favourite category----

@app.route("/api/user/<int:user_id>/favorite-category")
def favorite_category(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
        SELECT
            c.category_name AS favorite_category,
            IFNULL(SUM(e.amount), 0) AS total_spent
        FROM demo_expenses e
        JOIN categories c
        ON e.category_id=c.category_id
        WHERE e.user_id=%s
        GROUP BY c.category_name
        ORDER BY total_spent DESC
        LIMIT 1
        """, (user_id,))

        data = cursor.fetchone()

        if data:
            return jsonify({
                "favorite_category": data["favorite_category"],
                "total_spent": data["total_spent"]
            })

        return jsonify({
            "favorite_category": None,
            "total_spent": 0
        })
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/favorite-category", user_id)
        return jsonify({"error": "Failed to fetch favorite category", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#----8.most used payment mode----

@app.route("/api/user/<int:user_id>/payment-mode")
def payment_mode(user_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
SELECT
    payment_mode,
    COUNT(*) AS frequency
FROM demo_expenses
WHERE user_id=%s
GROUP BY payment_mode
ORDER BY frequency DESC
""",(user_id,))

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(rows)

#---9.budget status----

@app.route("/api/user/<int:user_id>/budget-status")
def budget_status(user_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT IFNULL(SUM(monthly_limit),0) AS budget
        FROM demo_budget
        WHERE user_id=%s
    """,(user_id,))
    budget = cursor.fetchone()["budget"]

    cursor.execute("""
        SELECT IFNULL(SUM(amount),0) AS total_expense
        FROM demo_expenses
        WHERE user_id=%s
    """,(user_id,))
    total_expense = cursor.fetchone()["total_expense"]

    remaining = budget - total_expense

    budget_used = 0
    if budget > 0:
        budget_used = (total_expense / budget) * 100

    cursor.close()
    connection.close()

    return jsonify({
        "budget": budget,
        "total_expense": total_expense,
        "remaining_budget": remaining,
        "budget_used": budget_used,
        "status": "Budget Exceeded" if total_expense > budget else "On Track"
    })


#----10. insight card-----

@app.route("/api/user/<int:user_id>/insights")
def insights(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
        SELECT
            c.category_name,
            SUM(e.amount) total
        FROM demo_expenses e
        JOIN categories c
        ON e.category_id=c.category_id
        WHERE e.user_id=%s
        GROUP BY c.category_name
        ORDER BY total DESC
        LIMIT 1
        """, (user_id,))
        favourite = cursor.fetchone()

        cursor.execute("""
        SELECT
            merchant,
            SUM(amount) total
        FROM demo_expenses
        WHERE user_id=%s
        GROUP BY merchant
        ORDER BY total DESC
        LIMIT 1
        """, (user_id,))
        merchant = cursor.fetchone()

        cursor.execute("""
        SELECT
            payment_mode,
            COUNT(*) frequency
        FROM demo_expenses
        WHERE user_id=%s
        GROUP BY payment_mode
        ORDER BY frequency DESC
        LIMIT 1
        """, (user_id,))
        payment = cursor.fetchone()

        return jsonify({
            "favorite_category": favourite,
            "favorite_merchant": merchant,
            "payment_mode": payment
        })
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in /api/user/%s/insights", user_id)
        return jsonify({"error": "Failed to fetch insights", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#--------add expense-------

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    from flask import request

    data = request.json
    print("========== RECEIVED DATA ==========")
    print(data)
    print("Category =", repr(data.get("category")))
    print("===================================")

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO expenses
        (user_id,category_id,merchant,payment_mode,amount,expense_date)
        VALUES(%s,
               (SELECT category_id FROM categories WHERE category_name=%s LIMIT 1),
               %s,%s,%s,%s)
    """,(
        data["user_id"],
        data["category"],
        data["merchant"],
        data["payment_mode"],
        data["amount"],
        data["date"]
    ))

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({"success":True})


#-------add income------
@app.route("/api/incomes", methods=["POST"])
def add_income():
    from flask import request

    try:
        data = request.json
        print("Received:", data)
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO income
            (user_id, source, amount, income_date)
            VALUES (%s, %s, %s, %s)
        """, (
            data["user_id"],
            data["source"],
            data["amount"],
            data["date"]
        ))

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({"success": True})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



#------register------    


@app.route("/api/register", methods=["POST"])
def register():
    from flask import request

    data = request.json

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT user_id FROM users WHERE email=%s",
        (data["email"],)
    )

    if cursor.fetchone():
        cursor.close()
        connection.close()
        return jsonify({"error": "Email already exists"}), 400

    print(data)

    cursor.execute("""
    INSERT INTO users
    (full_name, email, phone, password, created_at)
    VALUES(%s, %s, %s, %s, NOW())
""", (
    data["name"],
    data["email"],
    data["phone"],
    data["password"]
))
    

    connection.commit()

    user_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return jsonify({
        "success": True,
        "user": {
            "user_id": user_id,
            "full_name": data["name"],
            "email": data["email"],
            "phone": data["phone"]
        }
    })


# ---- 11. Recent Transactions ----

@app.route("/api/user/<int:user_id>/transactions")
def transactions(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                expense_id AS transaction_id,
                user_id,
                amount,
                merchant,
                payment_mode,
                expense_date AS transaction_date,
                c.category_name
            FROM demo_expenses e
            JOIN categories c
            ON e.category_id = c.category_id
            WHERE user_id=%s

            UNION ALL

            SELECT
                income_id AS transaction_id,
                user_id,
                amount,
                source AS merchant,
                'Income' AS payment_mode,
                income_date AS transaction_date,
                'Income' AS category_name
            FROM demo_income
            WHERE user_id=%s

            ORDER BY transaction_date DESC
            LIMIT 20
        """, (user_id, user_id))

        data = cursor.fetchall()

        return jsonify(data)

    except Exception as exc:
        traceback.print_exc()
        return jsonify({
            "error": str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


#12.main dashboard--------

@app.route("/api/user/<int:user_id>/dashboard")
def user_dashboard(user_id):
    raw_year = request.args.get("year")
    try:
        selected_year = int(raw_year) if raw_year is not None else None
    except ValueError:
        return jsonify({"error": "Year must be a valid integer"}), 400
    if selected_year is not None and selected_year < 1:
        return jsonify({"error": "Year must be greater than zero"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT YEAR(CURDATE()) AS current_year, MONTH(CURDATE()) AS current_month")
        current_date = cursor.fetchone()
        current_year = int(current_date["current_year"])
        current_month = int(current_date["current_month"])
        selected_year = selected_year or current_year

        cursor.execute("""
            SELECT data_year AS year FROM (
                SELECT YEAR(expense_date) AS data_year
                FROM expenses
                WHERE user_id=%s
                UNION
                SELECT YEAR(income_date) AS data_year
                FROM income
                WHERE user_id=%s
                UNION
                SELECT %s AS data_year
            ) AS personal_years
            ORDER BY year DESC
        """, (user_id, user_id, current_year))
        available_years = [int(row["year"]) for row in cursor.fetchall()]
        if selected_year not in available_years:
            available_years.append(selected_year)
            available_years.sort(reverse=True)

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_income
            FROM income
            WHERE user_id=%s AND YEAR(income_date)=%s
        """, (user_id, selected_year))
        total_income = float(cursor.fetchone()["total_income"] or 0)

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_expense
            FROM expenses
            WHERE user_id=%s AND YEAR(expense_date)=%s
        """, (user_id, selected_year))
        total_expense = float(cursor.fetchone()["total_expense"] or 0)

        cursor.execute("""
            SELECT MONTH(expense_date) AS month_no, SUM(amount) AS total
            FROM expenses
            WHERE user_id=%s AND YEAR(expense_date)=%s
            GROUP BY MONTH(expense_date)
            ORDER BY month_no
        """, (user_id, selected_year))
        by_month = [0.0] * 12
        for row in cursor.fetchall():
            by_month[row["month_no"] - 1] = float(row["total"] or 0)

        cursor.execute("""
            SELECT c.category_name, SUM(e.amount) AS total
            FROM expenses e
            LEFT JOIN categories c ON e.category_id=c.category_id
            WHERE e.user_id=%s AND YEAR(e.expense_date)=%s
            GROUP BY c.category_name
            ORDER BY total DESC
        """, (user_id, selected_year))
        categories = {
            row["category_name"] or "Uncategorized": float(row["total"] or 0)
            for row in cursor.fetchall()
        }

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_income
            FROM income
            WHERE user_id=%s AND YEAR(income_date)=%s AND MONTH(income_date)=%s
        """, (user_id, current_year, current_month))
        month_income = float(cursor.fetchone()["total_income"] or 0)

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_expense
            FROM expenses
            WHERE user_id=%s AND YEAR(expense_date)=%s AND MONTH(expense_date)=%s
        """, (user_id, current_year, current_month))
        month_expense = float(cursor.fetchone()["total_expense"] or 0)

        cursor.execute("""
            SELECT c.category_name, SUM(e.amount) AS total
            FROM expenses e
            LEFT JOIN categories c ON e.category_id=c.category_id
            WHERE e.user_id=%s AND YEAR(e.expense_date)=%s AND MONTH(e.expense_date)=%s
            GROUP BY c.category_name
            ORDER BY total DESC
        """, (user_id, current_year, current_month))
        current_month_categories = {
            row["category_name"] or "Uncategorized": float(row["total"] or 0)
            for row in cursor.fetchall()
        }

        cursor.execute("""
            SELECT * FROM (
                SELECT
                    e.expense_id AS transaction_id,
                    e.expense_date AS transaction_date,
                    COALESCE(c.category_name, 'Uncategorized') AS category,
                    COALESCE(NULLIF(e.merchant, ''), c.category_name, 'Expense') AS description,
                    e.amount,
                    'Expense' AS transaction_type
                FROM expenses e
                LEFT JOIN categories c ON e.category_id=c.category_id
                WHERE e.user_id=%s
                UNION ALL
                SELECT
                    i.income_id AS transaction_id,
                    i.income_date AS transaction_date,
                    'Income' AS category,
                    COALESCE(NULLIF(i.source, ''), 'Income') AS description,
                    i.amount,
                    'Income' AS transaction_type
                FROM income i
                WHERE i.user_id=%s
            ) AS personal_transactions
            ORDER BY transaction_date DESC, transaction_id DESC
            LIMIT 5
        """, (user_id, user_id))
        latest = []
        for row in cursor.fetchall():
            transaction_date = row["transaction_date"]
            latest.append({
                "id": row["transaction_id"],
                "date": transaction_date.isoformat() if hasattr(transaction_date, "isoformat") else str(transaction_date),
                "category": row["category"],
                "description": row["description"],
                "amount": float(row["amount"] or 0),
                "type": row["transaction_type"],
            })

        return jsonify({
            "user_id": user_id,
            "year": selected_year,
            "available_years": available_years,
            "total_income": total_income,
            "total_expense": total_expense,
            "savings": total_income - total_expense,
            "by_month": by_month,
            "categories": categories,
            "current_year": current_year,
            "current_month": current_month,
            "month_income": month_income,
            "month_expense": month_expense,
            "month_savings": month_income - month_expense,
            "current_month_categories": current_month_categories,
            "latest": latest,
        })
    except Exception:
        logger.exception("Error loading personal dashboard for user %s", user_id)
        return jsonify({"error": "Failed to fetch personal dashboard"}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


# Personal dashboard monthly details. This deliberately reads only the
# logged-in user's personal expenses and income, never the demo analytics data.
@app.route("/api/user/<int:user_id>/personal/month/<int:year>/<int:month>")
def personal_month_details(user_id, year, month):
    if user_id < 1 or year < 1 or month < 1 or month > 12:
        return jsonify({"error": "Invalid user, year, or month"}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                e.expense_id AS transaction_id,
                e.expense_date AS transaction_date,
                COALESCE(c.category_name, 'Uncategorized') AS category,
                COALESCE(NULLIF(e.merchant, ''), c.category_name, 'Expense') AS description,
                e.amount,
                'Expense' AS transaction_type
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.category_id
            WHERE e.user_id=%s
              AND YEAR(e.expense_date)=%s
              AND MONTH(e.expense_date)=%s
            ORDER BY e.expense_date DESC, e.expense_id DESC
        """, (user_id, year, month))
        expense_rows = cursor.fetchall()

        cursor.execute("""
            SELECT
                income_id AS transaction_id,
                income_date AS transaction_date,
                'Income' AS category,
                COALESCE(NULLIF(source, ''), 'Income') AS description,
                amount,
                'Income' AS transaction_type
            FROM income
            WHERE user_id=%s
              AND YEAR(income_date)=%s
              AND MONTH(income_date)=%s
            ORDER BY income_date DESC, income_id DESC
        """, (user_id, year, month))
        income_rows = cursor.fetchall()

        transactions = []
        category_totals = {}
        total_expenses = 0.0
        total_income = 0.0

        for row in expense_rows + income_rows:
            amount = float(row["amount"] or 0)
            transaction_type = row["transaction_type"]
            date = row["transaction_date"]
            category = row["category"]
            transactions.append({
                "id": row["transaction_id"],
                "date": date.isoformat() if hasattr(date, "isoformat") else str(date),
                "category": category,
                "description": row["description"],
                "amount": amount,
                "type": transaction_type,
            })

            if transaction_type == "Expense":
                total_expenses += amount
                category_totals[category] = category_totals.get(category, 0) + amount
            else:
                total_income += amount

        transactions.sort(key=lambda transaction: (transaction["date"], transaction["id"]), reverse=True)

        return jsonify({
            "user_id": user_id,
            "year": year,
            "month": month,
            "total_expenses": total_expenses,
            "total_income": total_income,
            "transaction_count": len(transactions),
            "category_totals": category_totals,
            "transactions": transactions,
        })
    except Exception:
        logger.exception("Error loading personal monthly details for user %s, year %s, month %s", user_id, year, month)
        return jsonify({"error": "Failed to fetch personal monthly details"}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


#13-----delete expense------
@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM expenses WHERE expense_id=%s",
        (expense_id,)
    )

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({"success": True})


#14-----delete month data------
@app.route("/api/user/<int:user_id>/month/<int:year>/<int:month>", methods=["DELETE"])
def delete_month_data(user_id, year, month):
    if month < 1 or month > 12 or year < 1:
        return jsonify({"error": "Invalid month or year"}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.autocommit = False
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM expenses WHERE user_id=%s AND YEAR(expense_date)=%s AND MONTH(expense_date)=%s",
            (user_id, year, month),
        )
        expenses_deleted = cursor.rowcount

        cursor.execute(
            "DELETE FROM income WHERE user_id=%s AND YEAR(income_date)=%s AND MONTH(income_date)=%s",
            (user_id, year, month),
        )
        income_deleted = cursor.rowcount

        cursor.execute(
            "DELETE FROM budget WHERE user_id=%s AND year=%s AND month=%s",
            (user_id, year, month),
        )
        budget_deleted = cursor.rowcount

        connection.commit()

        return jsonify({
            "success": True,
            "deleted": {
                "expenses": expenses_deleted,
                "income": income_deleted,
                "budget": budget_deleted,
            },
        })
    except Exception as exc:
        if connection is not None:
            connection.rollback()
        logger.exception("Error deleting month %s/%s for user %s", month, year, user_id)
        return jsonify({"error": "Failed to delete month data", "details": str(exc)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


# ----- Yearly Category Analysis -----

@app.route("/api/user/<int:user_id>/categories")
def yearly_categories(user_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                c.category_name,
                SUM(e.amount) AS total
            FROM demo_expenses e
            JOIN categories c
                ON e.category_id = c.category_id
            WHERE e.user_id = %s
            GROUP BY c.category_name
            ORDER BY total DESC
        """, (user_id,))

        data = cursor.fetchall()
        return jsonify(data)

    except Exception as exc:
        traceback.print_exc()
        logger.exception("Error in yearly category analysis")
        return jsonify({
            "error": "Failed to fetch yearly categories",
            "details": str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()




if __name__ == "__main__":
    subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1"],
        cwd="frontend",
        shell=True
    )

    def open_browser():
        time.sleep(3)
        webbrowser.open("http://127.0.0.1:5173")

    threading.Thread(target=open_browser, daemon=True).start()

    app.run(debug=True)
