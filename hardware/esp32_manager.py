import time
from threading import RLock


class ESP32Manager:
    def __init__(self, timeout_seconds=10):
        self.timeout_seconds = timeout_seconds
        self.lock = RLock()

        self.device_id = None
        self.connected = False
        self.last_seen = None
        self.ip_address = None
        self.firmware_version = None

        self.websocket = None

        self.sensors = {
            "ph": False,
            "tds": False,
            "tcs3448": False
        }

        self.latest_readings = {
            "ph": None,
            "tds": None,
            "tcs3448": None
        }

    def device_connected(
        self,
        device_id,
        ip_address=None,
        firmware_version=None,
        websocket=None
    ):
        with self.lock:
            self.device_id = device_id
            self.connected = True
            self.last_seen = time.time()
            self.ip_address = ip_address
            self.firmware_version = firmware_version
            self.websocket = websocket

    def heartbeat(self):
        with self.lock:
            self.connected = True
            self.last_seen = time.time()

    def device_disconnected(self, websocket=None):
        with self.lock:
            if websocket is not None and self.websocket is not websocket:
                return

            self.connected = False
            self.websocket = None

            for sensor in self.sensors:
                self.sensors[sensor] = False

    def update_sensor_status(self, sensor, online):
        with self.lock:
            if sensor in self.sensors:
                self.sensors[sensor] = bool(online)

    def update_reading(self, sensor, value):
        with self.lock:
            if sensor in self.latest_readings:
                self.latest_readings[sensor] = value

            self.last_seen = time.time()

    def send_to_esp32(self, message):
        with self.lock:
            if not self.connected or self.websocket is None:
                return False

            try:
                self.websocket.send(message)
                return True

            except Exception:
                self.connected = False
                self.websocket = None

                for sensor in self.sensors:
                    self.sensors[sensor] = False

                return False

    def check_timeout(self):
        with self.lock:
            if not self.connected or self.last_seen is None:
                return False

            elapsed = time.time() - self.last_seen

            if elapsed > self.timeout_seconds:
                self.connected = False
                self.websocket = None

                for sensor in self.sensors:
                    self.sensors[sensor] = False

                return True

        return False

    def get_status(self):
        with self.lock:
            self.check_timeout()

            return {
                "esp32": {
                    "connected": self.connected,
                    "device_id": self.device_id,
                    "ip": self.ip_address,
                    "firmware": self.firmware_version,
                    "last_seen": self.last_seen
                },
                "sensors": self.sensors.copy(),
                "readings": self.latest_readings.copy()
            }


esp32_manager = ESP32Manager(timeout_seconds=10)