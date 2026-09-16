import time
from threading import RLock
from queue import Queue, Empty


class ESP32Manager:
    def __init__(self, timeout_seconds=15):
        self.timeout_seconds = timeout_seconds
        self.lock = RLock()

        self.device_id = None
        self.connected = False
        self.last_seen = None
        self.ip_address = None
        self.firmware_version = None

        self.websocket = None
        self.command_queue = Queue()

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

            while True:
                try:
                    self.command_queue.get_nowait()
                except Empty:
                    break

            print(
                f"ESP32 connected: {device_id} "
                f"| IP: {ip_address} "
                f"| Firmware: {firmware_version}"
            )

    def heartbeat(self):
        with self.lock:
            if self.websocket is None:
                return False

            self.connected = True
            self.last_seen = time.time()
            return True

    def device_disconnected(self, websocket=None):
        with self.lock:
            # Never let an old WebSocket disconnect a newer one.
            if (
                websocket is not None
                and self.websocket is not None
                and self.websocket is not websocket
            ):
                print(
                    "Ignoring disconnect from old ESP32 WebSocket."
                )
                return False

            self.connected = False
            self.websocket = None

            for sensor in self.sensors:
                self.sensors[sensor] = False

            while True:
                try:
                    self.command_queue.get_nowait()
                except Empty:
                    break

            print("ESP32 manager marked device offline.")
            return True

    def update_sensor_status(self, sensor, online):
        with self.lock:
            if sensor not in self.sensors:
                return False

            self.sensors[sensor] = bool(online)

            # Sensor status is also a valid sign of activity.
            if self.websocket is not None:
                self.last_seen = time.time()

            return True

    def update_reading(self, sensor, value):
        with self.lock:
            if sensor in self.latest_readings:
                self.latest_readings[sensor] = value

            if self.websocket is not None:
                self.last_seen = time.time()

    def queue_command(self, message):
        with self.lock:
            if not self.connected or self.websocket is None:
                print(
                    "Cannot queue command: ESP32 is offline."
                )
                return False

            self.command_queue.put(message)
            print("ESP32 command queued successfully.")
            return True

    def get_next_command(self):
        try:
            return self.command_queue.get_nowait()
        except Empty:
            return None

    def check_timeout(self):
        with self.lock:
            if not self.connected:
                return False

            if self.websocket is None:
                self.connected = False

                for sensor in self.sensors:
                    self.sensors[sensor] = False

                return True

            if self.last_seen is None:
                self.last_seen = time.time()
                return False

            elapsed = time.time() - self.last_seen

            if elapsed > self.timeout_seconds:
                print(
                    "ESP32 heartbeat timeout: "
                    f"{elapsed:.1f}s without communication."
                )

                self.connected = False
                self.websocket = None

                for sensor in self.sensors:
                    self.sensors[sensor] = False

                while True:
                    try:
                        self.command_queue.get_nowait()
                    except Empty:
                        break

                return True

        return False

    def get_status(self):
        with self.lock:
            now = time.time()

            elapsed = None

            if self.last_seen is not None:
                elapsed = now - self.last_seen

            return {
                "esp32": {
                    "connected": self.connected,
                    "device_id": self.device_id,
                    "ip": self.ip_address,
                    "firmware": self.firmware_version,
                    "last_seen": self.last_seen,
                    "seconds_since_last_seen": elapsed
                },
                "sensors": self.sensors.copy(),
                "readings": self.latest_readings.copy()
            }


esp32_manager = ESP32Manager(timeout_seconds=15)
