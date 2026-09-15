import csv
import os
import sqlite3
from datetime import datetime

from config import DATABASE_PATH, EXPORT_FOLDER

TCS_FIELDS = [
    "tcs3448_f1",
    "tcs3448_f2",
    "tcs3448_fz",
    "tcs3448_f3",
    "tcs3448_f4",
    "tcs3448_f5",
    "tcs3448_fy",
    "tcs3448_fxl",
    "tcs3448_f6",
    "tcs3448_f7",
    "tcs3448_f8",
    "tcs3448_nir",
    "tcs3448_clear",
    "tcs3448_flicker"
]

ADULTERANT_FIELDS = [
    "water_present",
    "urea_present",
    "starch_present",
    "detergent_present",
    "water_amount",
    "water_unit",
    "urea_amount",
    "urea_unit",
    "starch_amount",
    "starch_unit",
    "detergent_amount",
    "detergent_unit"
]

REQUIRED_COLUMNS = {
    "sample_id": "TEXT",
    "milk_type": "TEXT",
    "milk_volume_ml": "REAL",
    "adulterant": "TEXT",
    "addition_amount": "REAL",
    "addition_unit": "TEXT",
    "concentration": "REAL",
    "ph": "REAL",
    "tds": "REAL",
    "water_present": "INTEGER DEFAULT 0",
    "urea_present": "INTEGER DEFAULT 0",
    "starch_present": "INTEGER DEFAULT 0",
    "detergent_present": "INTEGER DEFAULT 0",
    "water_amount": "REAL",
    "water_unit": "TEXT",
    "urea_amount": "REAL",
    "urea_unit": "TEXT",
    "starch_amount": "REAL",
    "starch_unit": "TEXT",
    "detergent_amount": "REAL",
    "detergent_unit": "TEXT",
    "tcs3448_f1": "REAL",
    "tcs3448_f2": "REAL",
    "tcs3448_fz": "REAL",
    "tcs3448_f3": "REAL",
    "tcs3448_f4": "REAL",
    "tcs3448_f5": "REAL",
    "tcs3448_fy": "REAL",
    "tcs3448_fxl": "REAL",
    "tcs3448_f6": "REAL",
    "tcs3448_f7": "REAL",
    "tcs3448_f8": "REAL",
    "tcs3448_nir": "REAL",
    "tcs3448_clear": "REAL",
    "tcs3448_flicker": "REAL",
    "created_at": "TEXT"
}


def get_connection():
    directory = os.path.dirname(DATABASE_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_connection()
    try:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id TEXT UNIQUE,
                milk_type TEXT,
                milk_volume_ml REAL,
                adulterant TEXT,
                addition_amount REAL,
                addition_unit TEXT,
                concentration REAL,
                ph REAL,
                tds REAL,
                water_present INTEGER DEFAULT 0,
                urea_present INTEGER DEFAULT 0,
                starch_present INTEGER DEFAULT 0,
                detergent_present INTEGER DEFAULT 0,
                water_amount REAL,
                water_unit TEXT,
                urea_amount REAL,
                urea_unit TEXT,
                starch_amount REAL,
                starch_unit TEXT,
                detergent_amount REAL,
                detergent_unit TEXT,
                tcs3448_f1 REAL,
                tcs3448_f2 REAL,
                tcs3448_fz REAL,
                tcs3448_f3 REAL,
                tcs3448_f4 REAL,
                tcs3448_f5 REAL,
                tcs3448_fy REAL,
                tcs3448_fxl REAL,
                tcs3448_f6 REAL,
                tcs3448_f7 REAL,
                tcs3448_f8 REAL,
                tcs3448_nir REAL,
                tcs3448_clear REAL,
                tcs3448_flicker REAL,
                created_at TEXT
            )
        """)

        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(samples)"
            ).fetchall()
        }

        for column, column_type in REQUIRED_COLUMNS.items():
            if column not in columns:
                connection.execute(
                    f"ALTER TABLE samples ADD COLUMN {column} {column_type}"
                )
                print(f"Added missing database column: {column}")

        connection.commit()
    finally:
        connection.close()


def get_next_sample_id():
    connection = get_connection()
    try:
        row = connection.execute("""
            SELECT MAX(
                CAST(SUBSTR(sample_id, 2) AS INTEGER)
            ) AS max_number
            FROM samples
            WHERE sample_id GLOB 'S[0-9]*'
        """).fetchone()
    finally:
        connection.close()

    max_number = (
        row["max_number"]
        if row and row["max_number"] is not None
        else 0
    )
    return f"S{max_number + 1:03d}"


def save_sample(data):
    connection = get_connection()
    try:
        sample_id = get_next_sample_id()

        fields = [
            "sample_id",
            "milk_type",
            "milk_volume_ml",
            "adulterant",
            "addition_amount",
            "addition_unit",
            "concentration",
            "ph",
            "tds",
            "water_present",
            "urea_present",
            "starch_present",
            "detergent_present",
            "water_amount",
            "water_unit",
            "urea_amount",
            "urea_unit",
            "starch_amount",
            "starch_unit",
            "detergent_amount",
            "detergent_unit"
        ] + TCS_FIELDS + ["created_at"]

        values = [
            sample_id,
            data.get("milk_type"),
            data.get("milk_volume_ml"),
            data.get("adulterant"),
            data.get("addition_amount"),
            data.get("addition_unit"),
            data.get("concentration"),
            data.get("ph"),
            data.get("tds"),
            data.get("water_present", 0),
            data.get("urea_present", 0),
            data.get("starch_present", 0),
            data.get("detergent_present", 0),
            data.get("water_amount"),
            data.get("water_unit"),
            data.get("urea_amount"),
            data.get("urea_unit"),
            data.get("starch_amount"),
            data.get("starch_unit"),
            data.get("detergent_amount"),
            data.get("detergent_unit")
        ]

        values.extend(data.get(field) for field in TCS_FIELDS)
        values.append(datetime.now().isoformat(timespec="seconds"))

        placeholders = ", ".join(["?"] * len(fields))

        connection.execute(
            f"""
            INSERT INTO samples ({", ".join(fields)})
            VALUES ({placeholders})
            """,
            values
        )

        connection.commit()
        return sample_id
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_all_samples():
    connection = get_connection()
    try:
        fields = [
            "sample_id",
            "milk_type",
            "milk_volume_ml",
            "adulterant",
            "addition_amount",
            "addition_unit",
            "concentration",
            "ph",
            "tds",
            "water_present",
            "urea_present",
            "starch_present",
            "detergent_present",
            "water_amount",
            "water_unit",
            "urea_amount",
            "urea_unit",
            "starch_amount",
            "starch_unit",
            "detergent_amount",
            "detergent_unit"
        ] + TCS_FIELDS + ["created_at"]

        rows = connection.execute(
            f"""
            SELECT {", ".join(fields)}
            FROM samples
            ORDER BY id ASC
            """
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        connection.close()


def delete_sample(sample_id):
    connection = get_connection()
    try:
        cursor = connection.execute(
            "DELETE FROM samples WHERE sample_id = ?",
            (sample_id,)
        )
        deleted = cursor.rowcount > 0
        connection.commit()
        return deleted
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def export_csv():
    os.makedirs(EXPORT_FOLDER, exist_ok=True)
    filepath = os.path.join(
        EXPORT_FOLDER,
        "milk_dataset.csv"
    )

    samples = get_all_samples()

    fieldnames = [
        "sample_id",
        "milk_type",
        "milk_volume_ml",
        "adulterant",
        "addition_amount",
        "addition_unit",
        "concentration",
        "water_present",
        "water_amount",
        "water_unit",
        "urea_present",
        "urea_amount",
        "urea_unit",
        "starch_present",
        "starch_amount",
        "starch_unit",
        "detergent_present",
        "detergent_amount",
        "detergent_unit",
        "ph",
        "tds"
    ] + TCS_FIELDS + ["created_at"]

    with open(
        filepath,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )
        writer.writeheader()
        writer.writerows(samples)

    return filepath
