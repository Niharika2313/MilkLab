import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SECRET_KEY = "milk-adulteration-project"
DATABASE_PATH = os.path.join(BASE_DIR, "data", "milk.db")
EXPORT_FOLDER = os.path.join(BASE_DIR, "exports")

ESP32_DEVICE_ID = "MILK-ESP32S3-01"
ESP32_TIMEOUT_SECONDS = 10
SOCKETIO_ASYNC_MODE = "threading"