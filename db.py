"""Database configuration and one-time setup.

Connection settings come from environment variables so the same code runs
locally and on Render:

  DATABASE_URL   mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED   (optional, wins if set)
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true|false

For local development put these in a `.env` file next to app.py.
"""

import csv
import logging
import os
from urllib.parse import parse_qs, unquote, urlparse

import mysql.connector

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")


def get_db_config():
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        parsed = urlparse(url)
        query = {k.lower(): v[0] for k, v in parse_qs(parsed.query).items()}
        ssl_mode = query.get("ssl-mode", query.get("ssl_mode", "")).upper()
        config = {
            "host": parsed.hostname,
            "port": parsed.port or 3306,
            "user": unquote(parsed.username or ""),
            "password": unquote(parsed.password or ""),
            "database": (parsed.path or "/").lstrip("/") or "defaultdb",
            "use_ssl": ssl_mode not in ("", "DISABLED"),
        }
    else:
        config = {
            "host": os.environ.get("DB_HOST", "localhost"),
            "port": int(os.environ.get("DB_PORT", "3306")),
            "user": os.environ.get("DB_USER", "root"),
            "password": os.environ.get("DB_PASSWORD", ""),
            "database": os.environ.get("DB_NAME", "expenses_tracker"),
            "use_ssl": os.environ.get("DB_SSL", "false").lower() in ("1", "true", "yes", "required"),
        }
    return config


def connect():
    cfg = get_db_config()
    kwargs = {
        "host": cfg["host"],
        "port": cfg["port"],
        "user": cfg["user"],
        "password": cfg["password"],
        "database": cfg["database"],
        "autocommit": True,
        "connection_timeout": 30,
    }
    if cfg["use_ssl"]:
        # Encrypted connection (required by Aiven). Certificate is not pinned.
        kwargs["ssl_disabled"] = False
    return mysql.connector.connect(**kwargs)


CATEGORIES = {
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
    112: "Gifts & Donations",
    113: "Utilities",
}

DEMO_USER_COUNT = 15

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS categories (
        category_id INT PRIMARY KEY,
        category_name VARCHAR(50) NOT NULL UNIQUE
    )
    """,
    # Personal data entered through the app
    """
    CREATE TABLE IF NOT EXISTS expenses (
        expense_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT,
        amount DECIMAL(12,2) NOT NULL,
        expense_date DATE NOT NULL,
        payment_mode VARCHAR(30),
        merchant VARCHAR(100),
        INDEX idx_exp_user_date (user_id, expense_date)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS income (
        income_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        income_date DATE NOT NULL,
        source VARCHAR(100),
        INDEX idx_inc_user_date (user_id, income_date)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS budget (
        budget_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT,
        monthly_limit DECIMAL(12,2) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        INDEX idx_bud_user (user_id, year, month)
    )
    """,
    # Demo analytics data (loaded from dataset/*.csv)
    """
    CREATE TABLE IF NOT EXISTS demo_expenses (
        expense_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT,
        amount DECIMAL(12,2) NOT NULL,
        expense_date DATE NOT NULL,
        payment_mode VARCHAR(30),
        merchant VARCHAR(100),
        INDEX idx_dexp_user_date (user_id, expense_date)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS demo_income (
        income_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        income_date DATE NOT NULL,
        source VARCHAR(100),
        INDEX idx_dinc_user_date (user_id, income_date)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS demo_budget (
        budget_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT,
        monthly_limit DECIMAL(12,2) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        INDEX idx_dbud_user (user_id, year, month)
    )
    """,
]


def _table_empty(cursor, table):
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    return cursor.fetchone()[0] == 0


def _load_csv(cursor, table, filename, columns):
    path = os.path.join(DATASET_DIR, filename)
    if not os.path.exists(path):
        logger.warning("Seed file %s not found, skipping", path)
        return 0
    with open(path, newline="", encoding="utf-8") as fh:
        rows = [tuple(row[c] for c in columns) for row in csv.DictReader(fh)]
    placeholders = ",".join(["%s"] * len(columns))
    sql = f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})"
    for i in range(0, len(rows), 500):
        cursor.executemany(sql, rows[i : i + 500])
    return len(rows)


def init_database():
    """Create tables and seed demo data if missing. Safe to run on every start."""
    connection = connect()
    cursor = connection.cursor()
    try:
        # Only one gunicorn worker should do the setup at a time.
        cursor.execute("SELECT GET_LOCK('expense_tracker_init', 60)")
        cursor.fetchall()

        for statement in SCHEMA:
            cursor.execute(statement)

        cursor.executemany(
            "INSERT IGNORE INTO categories (category_id, category_name) VALUES (%s, %s)",
            list(CATEGORIES.items()),
        )

        if _table_empty(cursor, "users"):
            cursor.executemany(
                "INSERT INTO users (user_id, full_name, email, phone, password) VALUES (%s,%s,%s,%s,%s)",
                [
                    (i, f"Demo User {i}", f"demo{i}@expensevision.app", None, "demo123")
                    for i in range(1, DEMO_USER_COUNT + 1)
                ],
            )

        if _table_empty(cursor, "demo_expenses"):
            n = _load_csv(
                cursor,
                "demo_expenses",
                "expenses.csv",
                ["expense_id", "user_id", "category_id", "amount", "expense_date", "payment_mode", "merchant"],
            )
            logger.warning("Seeded %s demo expenses", n)

        if _table_empty(cursor, "demo_income"):
            _load_csv(
                cursor,
                "demo_income",
                "income.csv",
                ["income_id", "user_id", "amount", "income_date", "source"],
            )

        if _table_empty(cursor, "demo_budget"):
            _load_csv(
                cursor,
                "demo_budget",
                "budget.csv",
                ["budget_id", "user_id", "category_id", "monthly_limit", "month", "year"],
            )
    finally:
        try:
            cursor.execute("SELECT RELEASE_LOCK('expense_tracker_init')")
            cursor.fetchall()
        except Exception:
            pass
        cursor.close()
        connection.close()


if __name__ == "__main__":
    init_database()
    print("Database ready.")
