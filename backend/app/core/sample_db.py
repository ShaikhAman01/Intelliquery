"""
Sample e-commerce database for onboarding.

Generates a self-contained SQLite database that new users can query
instantly, without providing their own credentials. The file is built
once on first request and shared read-only by every user — the SQL
executor only permits SELECT statements, so a single shared file is safe.

Data is deterministic (seeded RNG) except for dates, which are spread
across the 365 days before generation so time-relative questions
("this month", "last quarter") return meaningful results.

Layout:
    customers ──< orders ──< order_items >── products
                     └────< payments
"""

import os
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from random import Random

from app.core.logger import logger

# backend/data/sample_ecommerce.db  (generated at runtime, gitignored)
SAMPLE_DB_DIR = Path(__file__).resolve().parents[2] / "data"
SAMPLE_DB_PATH = SAMPLE_DB_DIR / "sample_ecommerce.db"

SAMPLE_CONNECTION_NAME = "Sample E-commerce Store"

_build_lock = threading.Lock()

# ── Source data for the generator ────────────────────────────────────────────

_FIRST_NAMES = [
    "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "Lucas", "Mia", "Oliver", "Amelia", "Elijah", "Harper",
    "James", "Evelyn", "Benjamin", "Priya", "Arjun", "Fatima", "Omar",
    "Yuki", "Kenji", "Ingrid", "Lars", "Chloe", "Diego", "Lucia", "Mateo",
]
_LAST_NAMES = [
    "Smith", "Johnson", "Garcia", "Chen", "Patel", "Kim", "Nguyen",
    "Müller", "Rossi", "Silva", "Kowalski", "Tanaka", "Andersson",
    "Brown", "Davis", "Martinez", "Lopez", "Wilson", "Khan", "Ali",
]
_LOCATIONS = [
    ("United States", "New York"), ("United States", "San Francisco"),
    ("United States", "Austin"), ("United Kingdom", "London"),
    ("Germany", "Berlin"), ("France", "Paris"), ("India", "Mumbai"),
    ("India", "Bangalore"), ("Japan", "Tokyo"), ("Brazil", "São Paulo"),
    ("Canada", "Toronto"), ("Australia", "Sydney"), ("Spain", "Madrid"),
    ("Netherlands", "Amsterdam"), ("Singapore", "Singapore"),
]
_PRODUCTS = [
    # (name, category, price)
    ("Wireless Noise-Cancelling Headphones", "Electronics", 199.99),
    ("Smart Fitness Watch", "Electronics", 149.00),
    ("4K Action Camera", "Electronics", 249.50),
    ("Bluetooth Portable Speaker", "Electronics", 59.99),
    ("USB-C Fast Charger 65W", "Electronics", 34.90),
    ("Mechanical Keyboard", "Electronics", 89.00),
    ("Wireless Ergonomic Mouse", "Electronics", 42.50),
    ("1TB Portable SSD", "Electronics", 109.99),
    ("Smart Home Hub", "Electronics", 129.00),
    ("Noise Machine for Sleep", "Electronics", 27.99),
    ("Cast Iron Skillet 12-inch", "Home & Kitchen", 39.95),
    ("Espresso Machine", "Home & Kitchen", 289.00),
    ("Air Fryer 5.8QT", "Home & Kitchen", 99.99),
    ("Ceramic Dinnerware Set", "Home & Kitchen", 74.50),
    ("Robot Vacuum Cleaner", "Home & Kitchen", 219.00),
    ("Stainless Steel Cookware Set", "Home & Kitchen", 159.99),
    ("Electric Kettle", "Home & Kitchen", 32.00),
    ("Memory Foam Pillow", "Home & Kitchen", 45.99),
    ("Weighted Blanket 15lb", "Home & Kitchen", 69.90),
    ("Scented Candle Trio", "Home & Kitchen", 24.99),
    ("Yoga Mat Non-Slip", "Sports & Outdoors", 29.99),
    ("Adjustable Dumbbell Set", "Sports & Outdoors", 189.00),
    ("Trail Running Shoes", "Sports & Outdoors", 119.95),
    ("Insulated Water Bottle 32oz", "Sports & Outdoors", 24.50),
    ("Camping Tent 4-Person", "Sports & Outdoors", 139.00),
    ("Resistance Bands Set", "Sports & Outdoors", 19.99),
    ("Cycling Helmet", "Sports & Outdoors", 54.90),
    ("Hiking Backpack 40L", "Sports & Outdoors", 79.99),
    ("The Art of Data Science", "Books", 34.99),
    ("Deep Work: Rules for Focus", "Books", 16.99),
    ("Atomic Habits", "Books", 14.50),
    ("The Pragmatic Programmer", "Books", 42.00),
    ("Thinking, Fast and Slow", "Books", 18.99),
    ("SQL Queries for Mere Mortals", "Books", 39.95),
    ("Wooden Building Blocks 100pc", "Toys & Games", 36.99),
    ("Strategy Board Game", "Toys & Games", 44.50),
    ("Remote Control Car", "Toys & Games", 59.00),
    ("1000-Piece Jigsaw Puzzle", "Toys & Games", 17.99),
    ("STEM Robotics Kit", "Toys & Games", 89.99),
    ("Plush Dinosaur Toy", "Toys & Games", 21.50),
    ("Vitamin C Face Serum", "Beauty & Care", 27.99),
    ("Electric Toothbrush", "Beauty & Care", 64.90),
    ("Hair Dryer Ionic", "Beauty & Care", 49.99),
    ("Organic Skincare Set", "Beauty & Care", 84.00),
    ("Beard Grooming Kit", "Beauty & Care", 31.50),
]

_ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"]
_ORDER_STATUS_WEIGHTS = [6, 14, 18, 55, 7]
_PAYMENT_METHODS = ["credit_card", "paypal", "bank_transfer", "gift_card"]
_PAYMENT_METHOD_WEIGHTS = [55, 28, 12, 5]

_N_CUSTOMERS = 200
_N_ORDERS = 1000

_SCHEMA_SQL = """
CREATE TABLE customers (
    id           INTEGER PRIMARY KEY,
    name         TEXT    NOT NULL,
    email        TEXT    NOT NULL UNIQUE,
    country      TEXT    NOT NULL,
    city         TEXT    NOT NULL,
    signup_date  TEXT    NOT NULL
);

CREATE TABLE products (
    id             INTEGER PRIMARY KEY,
    name           TEXT    NOT NULL,
    category       TEXT    NOT NULL,
    price          REAL    NOT NULL,
    stock_quantity INTEGER NOT NULL
);

CREATE TABLE orders (
    id           INTEGER PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(id),
    order_date   TEXT    NOT NULL,
    status       TEXT    NOT NULL,
    total_amount REAL    NOT NULL
);

CREATE TABLE order_items (
    id         INTEGER PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL,
    unit_price REAL    NOT NULL
);

CREATE TABLE payments (
    id           INTEGER PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id),
    payment_date TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    method       TEXT    NOT NULL,
    status       TEXT    NOT NULL
);
"""


def _generate(conn: sqlite3.Connection) -> None:
    rng = Random(42)
    now = datetime.utcnow()

    conn.executescript(_SCHEMA_SQL)

    # Customers — signups skewed toward recent months so "signups this week
    # vs last week" style questions return data.
    customers = []
    for i in range(1, _N_CUSTOMERS + 1):
        first = rng.choice(_FIRST_NAMES)
        last = rng.choice(_LAST_NAMES)
        country, city = rng.choice(_LOCATIONS)
        days_ago = int(365 * rng.random() ** 1.6)  # bias toward recent
        signup = now - timedelta(days=days_ago, hours=rng.randint(0, 23))
        customers.append((
            i, f"{first} {last}",
            f"{first.lower()}.{last.lower()}{i}@example.com",
            country, city, signup.strftime("%Y-%m-%d %H:%M:%S"),
        ))
    conn.executemany("INSERT INTO customers VALUES (?,?,?,?,?,?)", customers)

    products = [
        (i, name, category, price, rng.randint(0, 250))
        for i, (name, category, price) in enumerate(_PRODUCTS, start=1)
    ]
    conn.executemany("INSERT INTO products VALUES (?,?,?,?,?)", products)

    orders, items, payments = [], [], []
    item_id = payment_id = 1
    for order_id in range(1, _N_ORDERS + 1):
        customer = rng.choice(customers)
        signup_dt = datetime.strptime(customer[5], "%Y-%m-%d %H:%M:%S")
        # Order happens between the customer's signup and now
        span = max(1, int((now - signup_dt).total_seconds() // 3600))
        order_dt = signup_dt + timedelta(hours=rng.randint(0, span))
        status = rng.choices(_ORDER_STATUSES, weights=_ORDER_STATUS_WEIGHTS)[0]

        total = 0.0
        for _ in range(rng.randint(1, 4)):
            product = rng.choice(products)
            qty = rng.choices([1, 2, 3], weights=[70, 22, 8])[0]
            items.append((item_id, order_id, product[0], qty, product[3]))
            total += qty * product[3]
            item_id += 1

        total = round(total, 2)
        orders.append((
            order_id, customer[0],
            order_dt.strftime("%Y-%m-%d %H:%M:%S"), status, total,
        ))

        if status != "pending":
            pay_dt = order_dt + timedelta(minutes=rng.randint(1, 120))
            pay_status = "refunded" if status == "cancelled" else "succeeded"
            method = rng.choices(_PAYMENT_METHODS, weights=_PAYMENT_METHOD_WEIGHTS)[0]
            payments.append((
                payment_id, order_id,
                pay_dt.strftime("%Y-%m-%d %H:%M:%S"), total, method, pay_status,
            ))
            payment_id += 1

    conn.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", orders)
    conn.executemany("INSERT INTO order_items VALUES (?,?,?,?,?)", items)
    conn.executemany("INSERT INTO payments VALUES (?,?,?,?,?,?)", payments)


def ensure_sample_db() -> str:
    """
    Build the sample database if it doesn't exist yet and return its
    absolute path. Safe to call concurrently: generation happens under a
    lock into a temp file that is atomically renamed into place.
    """
    if SAMPLE_DB_PATH.exists():
        return str(SAMPLE_DB_PATH)

    with _build_lock:
        if SAMPLE_DB_PATH.exists():  # another thread finished while we waited
            return str(SAMPLE_DB_PATH)

        SAMPLE_DB_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = SAMPLE_DB_PATH.with_suffix(".db.tmp")
        tmp_path.unlink(missing_ok=True)

        logger.info("Generating sample e-commerce database...")
        conn = sqlite3.connect(tmp_path)
        try:
            with conn:
                _generate(conn)
        finally:
            conn.close()

        os.replace(tmp_path, SAMPLE_DB_PATH)
        logger.info(f"Sample database ready at {SAMPLE_DB_PATH}")

    return str(SAMPLE_DB_PATH)
