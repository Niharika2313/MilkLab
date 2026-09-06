import csv
import os
import sqlite3
from datetime import datetime

from config import DATABASE_PATH, EXPORT_FOLDER


def get_connection():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_id TEXT UNIQUE NOT NULL,
            milk_type TEXT NOT NULL,
            adulterant TEXT NOT NULL,
            addition_amount REAL,
            addition_unit TEXT,
            concentration REAL,
            ph REAL,
            tds REAL,
            tcs3448_clear REAL,
            tcs3448_red REAL,
            tcs3448_green REAL,
            tcs3448_blue REAL,
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def get_next_sample_id():
    connection = get_connection()

    row = connection.execute("""
        SELECT MAX(
            CAST(SUBSTR(sample_id, 2) AS INTEGER)
        ) AS max_number
        FROM samples
        WHERE sample_id GLOB 'S[0-9]*'
    """).fetchone()

    connection.close()

    max_number = row["max_number"] if row and row["max_number"] is not None else 0

    return f"S{max_number + 1:03d}"


def save_sample(data):
    connection = get_connection()

    try:
        sample_id = get_next_sample_id()

        connection.execute("""
            INSERT INTO samples (
                sample_id,
                milk_type,
                adulterant,
                addition_amount,
                addition_unit,
                concentration,
                ph,
                tds,
                tcs3448_clear,
                tcs3448_red,
                tcs3448_green,
                tcs3448_blue,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sample_id,
            data["milk_type"],
            data["adulterant"],
            data.get("addition_amount"),
            data.get("addition_unit"),
            data.get("concentration"),
            data["ph"],
            data["tds"],
            data["tcs3448_clear"],
            data["tcs3448_red"],
            data["tcs3448_green"],
            data["tcs3448_blue"],
            datetime.now().isoformat(timespec="seconds")
        ))

        connection.commit()
        return sample_id

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def get_all_samples():
    connection = get_connection()

    rows = connection.execute("""
        SELECT
            sample_id,
            milk_type,
            adulterant,
            addition_amount,
            addition_unit,
            concentration,
            ph,
            tds,
            tcs3448_clear,
            tcs3448_red,
            tcs3448_green,
            tcs3448_blue,
            created_at
        FROM samples
        ORDER BY id ASC
    """).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def delete_sample(sample_id):
    connection = get_connection()

    cursor = connection.execute(
        "DELETE FROM samples WHERE sample_id = ?",
        (sample_id,)
    )

    deleted = cursor.rowcount > 0

    connection.commit()
    connection.close()

    return deleted


def export_csv():
    os.makedirs(EXPORT_FOLDER, exist_ok=True)

    filepath = os.path.join(
        EXPORT_FOLDER,
        "milk_dataset.csv"
    )

    samples = get_all_samples()

    if not samples:
        return filepath

    fieldnames = [
        "sample_id",
        "milk_type",
        "adulterant",
        "addition_amount",
        "addition_unit",
        "concentration",
        "ph",
        "tds",
        "tcs3448_clear",
        "tcs3448_red",
        "tcs3448_green",
        "tcs3448_blue",
        "created_at"
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(samples)

    return filepath