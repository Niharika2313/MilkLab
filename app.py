import os
import json
import time
import threading

from flask import Flask, render_template, jsonify, request, send_file
from flask_socketio import SocketIO, emit
from flask_sock import Sock

import database
from hardware.esp32_manager import esp32_manager
from config import SECRET_KEY, SOCKETIO_ASYNC_MODE


app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode=SOCKETIO_ASYNC_MODE,
    logger=True,
    engineio_logger=True
)

sock = Sock(app)

database.initialize_database()


@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/collection")
def collection():
    return render_template("collection.html")


@app.route("/dataset")
def dataset():
    return render_template("dataset.html")


@app.route("/sensors")
def sensors():
    return render_template("sensors.html")


@app.route("/analyze")
def analyze():
    return render_template("analyze.html")


@app.route("/calibration")
def calibration():
    return render_template("calibration.html")


@app.route("/analytics")
def analytics():
    return render_template("analytics.html")


@app.route("/api/status")
def status():
    return jsonify(
        esp32_manager.get_status()
    )


@app.route("/api/next-sample-id")
def next_sample_id():
    return jsonify({
        "sample_id":
            database.get_next_sample_id()
    })


@app.route("/api/samples")
def samples():
    return jsonify(
        database.get_all_samples()
    )


@app.route(
    "/api/samples/<sample_id>",
    methods=["DELETE"]
)
def delete_sample(sample_id):
    success = database.delete_sample(
        sample_id
    )

    return jsonify({
        "success": success
    })


@app.route("/api/export")
def export_dataset():
    filepath = database.export_csv()

    if not os.path.exists(filepath):
        return jsonify({
            "error":
                "No dataset available"
        }), 404

    return send_file(
        filepath,
        as_attachment=True
    )


@sock.route("/esp32")
def esp32_websocket(ws):
    print()
    print("==============================")
    print(" ESP32 WEBSOCKET CONNECTED")
    print("==============================")

    current_ws = ws
    stop_sender = threading.Event()
    ws_send_lock = threading.Lock()

    def safe_ws_send(payload):
        with ws_send_lock:
            ws.send(payload)

    def send_commands():
        while not stop_sender.is_set():

            command = (
                esp32_manager
                .get_next_command()
            )

            if command is not None:
                try:
                    safe_ws_send(command)

                    print(
                        "Server → ESP32:",
                        command
                    )

                except Exception as error:
                    print(
                        "Failed to send command to ESP32:",
                        error
                    )
                    stop_sender.set()
                    break

            time.sleep(0.05)

    sender_thread = threading.Thread(
        target=send_commands,
        daemon=True
    )

    sender_thread.start()

    try:

        while True:

            try:
                message = ws.receive()

            except Exception as error:

                print(
                    "ESP32 receive error:",
                    error
                )

                break

            if message is None:
                break

            print(
                "ESP32 → Server:",
                message
            )

            try:
                data = json.loads(
                    message
                )

            except Exception:

                print(
                    "Invalid JSON from ESP32."
                )

                continue

            event = data.get(
                "event"
            )

            if event == "esp32_connect":

                device_id = data.get(
                    "device_id"
                )

                ip_address = data.get(
                    "ip"
                )

                firmware = data.get(
                    "firmware"
                )

                print(
                    "Device ID:",
                    device_id
                )

                print(
                    "IP:",
                    ip_address
                )

                print(
                    "Firmware:",
                    firmware
                )

                esp32_manager.device_connected(
                    device_id=device_id,
                    ip_address=ip_address,
                    firmware_version=firmware,
                    websocket=current_ws
                )

                print(
                    "ESP32 marked as ONLINE."
                )

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

                safe_ws_send(
                    json.dumps({
                        "event":
                            "server_connected",
                        "message":
                            "MilkLab server connected"
                    })
                )

            elif event == "esp32_heartbeat":

                esp32_manager.heartbeat()
                print("ESP32 heartbeat received.")

            elif event == "esp32_sensor_status":

                sensor = data.get(
                    "sensor"
                )

                online = data.get(
                    "online",
                    False
                )

                esp32_manager.update_sensor_status(
                    sensor,
                    online
                )

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

            elif event == "sensor_result":

                sensor = data.get(
                    "sensor"
                )

                value = data.get(
                    "value"
                )

                if sensor not in [
                    "ph",
                    "tds",
                    "tcs3448"
                ]:
                    continue

                esp32_manager.update_reading(
                    sensor,
                    value
                )

                socketio.emit(
                    "sensor_result",
                    data
                )

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

            elif event == "ph_progress":

                socketio.emit(
                    "ph_progress",
                    data
                )

            elif event == "tds_progress":

                socketio.emit(
                    "tds_progress",
                    data
                )

            elif event == "tcs3448_result":

                esp32_manager.update_reading(
                    "tcs3448",
                    data
                )

                socketio.emit(
                    "tcs3448_result",
                    data
                )

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

            elif event == "ph_calibration_started":

                socketio.emit(
                    "ph_calibration_started",
                    data
                )

            elif event == "ph_calibration_live":

                socketio.emit(
                    "ph_calibration_live",
                    data
                )

            elif event == "ph_calibration_captured":

                socketio.emit(
                    "ph_calibration_captured",
                    data
                )

            elif event == "ph_calibration_stopped":

                socketio.emit(
                    "ph_calibration_stopped",
                    data
                )

            elif event == "ph_calibration_current":

                socketio.emit(
                    "ph_calibration_current",
                    data
                )

            elif event == "ph_calibration_voltage":

                socketio.emit(
                    "ph_calibration_voltage",
                    data
                )

            elif event == "ph_calibration_saved":

                socketio.emit(
                    "ph_calibration_saved",
                    data
                )

            elif event == "ph_calibration_error":

                socketio.emit(
                    "ph_calibration_error",
                    data
                )

            elif event == "sensor_error":

                sensor = data.get(
                    "sensor"
                )

                message = data.get(
                    "message",
                    "Sensor measurement failed."
                )

                print(
                    f"Sensor error [{sensor}]: {message}"
                )

                socketio.emit(
                    "sensor_error",
                    data
                )

    except Exception as error:

        print(
            "ESP32 WebSocket error:",
            error
        )

    finally:

        stop_sender.set()

        print(
            "ESP32 WebSocket connection closed."
        )

        esp32_manager.device_disconnected(
            websocket=current_ws
        )

        socketio.emit(
            "system_status",
            esp32_manager.get_status()
        )


@socketio.on("connect")
def browser_connect():

    print()
    print(
        "Browser connected:",
        request.sid
    )

    emit(
        "system_status",
        esp32_manager.get_status()
    )


@socketio.on("disconnect")
def browser_disconnect():

    print(
        "Browser disconnected:",
        request.sid
    )


@socketio.on("esp32_connect")
def old_esp32_connect(data):

    print(
        "Legacy ESP32 Socket.IO event received:",
        data
    )


@socketio.on("esp32_heartbeat")
def old_esp32_heartbeat():

    esp32_manager.heartbeat()

    socketio.emit(
        "system_status",
        esp32_manager.get_status()
    )


@socketio.on("esp32_sensor_status")
def old_esp32_sensor_status(data):

    sensor = data.get(
        "sensor"
    )

    online = data.get(
        "online",
        False
    )

    esp32_manager.update_sensor_status(
        sensor,
        online
    )

    socketio.emit(
        "system_status",
        esp32_manager.get_status()
    )


@socketio.on("sensor_command")
def sensor_command(data):

    sensor = data.get(
        "sensor"
    )

    status = (
        esp32_manager
        .get_status()
    )

    if not status["esp32"]["connected"]:

        emit(
            "command_error",
            {
                "message":
                    "ESP32 is offline."
            }
        )

        return

    if sensor not in [
        "ph",
        "tds",
        "tcs3448"
    ]:

        emit(
            "command_error",
            {
                "message":
                    "Unknown sensor."
            }
        )

        return

    if not status["sensors"].get(
        sensor,
        False
    ):

        emit(
            "command_error",
            {
                "message":
                    sensor.upper() +
                    " sensor is offline."
            }
        )

        return

    message = json.dumps({
        "event":
            "measure_sensor",
        "sensor":
            sensor
    })

    print(
        "Queueing command for ESP32:",
        message
    )

    success = (
        esp32_manager
        .queue_command(message)
    )

    if not success:

        emit(
            "command_error",
            {
                "message":
                    "Unable to communicate with ESP32."
            }
        )

        return

    emit(
        "command_accepted",
        {
            "sensor":
                sensor
        }
    )


@socketio.on("ph_calibration_measure")
def ph_calibration_measure(data):

    try:

        point = data.get(
            "point"
        )

        if point not in [
            "ph4",
            "ph7",
            "ph920"
        ]:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "Invalid calibration point."
                }
            )

            return

        status = (
            esp32_manager
            .get_status()
        )

        if not status["esp32"]["connected"]:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "ESP32 is offline."
                }
            )

            return

        if not status["sensors"].get(
            "ph",
            False
        ):

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "pH sensor is offline."
                }
            )

            return

        message = json.dumps({
            "event":
                "ph_calibration_measure",
            "point":
                point
        })

        success = (
            esp32_manager
            .queue_command(message)
        )

        if not success:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "Unable to communicate with ESP32."
                }
            )

            return

        emit(
            "ph_calibration_command_accepted",
            {
                "point":
                    point
            }
        )

    except Exception as error:

        emit(
            "ph_calibration_error",
            {
                "error":
                    str(error)
            }
        )


@socketio.on("ph_calibration_stop")
def ph_calibration_stop(data):

    try:

        point = data.get(
            "point"
        )

        if point not in [
            "ph4",
            "ph7",
            "ph920"
        ]:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "Invalid calibration point."
                }
            )

            return

        status = (
            esp32_manager
            .get_status()
        )

        if not status["esp32"]["connected"]:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "ESP32 is offline."
                }
            )

            return

        message = json.dumps({
            "event":
                "ph_calibration_stop",
            "point":
                point
        })

        success = (
            esp32_manager
            .queue_command(message)
        )

        if not success:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "Unable to communicate with ESP32."
                }
            )

            return

    except Exception as error:

        emit(
            "ph_calibration_error",
            {
                "error":
                    str(error)
            }
        )


@socketio.on("get_ph_calibration")
def get_ph_calibration():

    try:

        status = (
            esp32_manager
            .get_status()
        )

        if not status["esp32"]["connected"]:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "ESP32 is offline."
                }
            )

            return

        message = json.dumps({
            "event":
                "get_ph_calibration"
        })

        success = (
            esp32_manager
            .queue_command(message)
        )

        if not success:

            emit(
                "ph_calibration_error",
                {
                    "error":
                        "Unable to communicate with ESP32."
                }
            )

    except Exception as error:

        emit(
            "ph_calibration_error",
            {
                "error":
                    str(error)
            }
        )


@socketio.on("save_ph_calibration")
def save_ph_calibration(data):

    try:

        ph4 = float(
            data.get(
                "ph4_voltage"
            )
        )

        ph7 = float(
            data.get(
                "ph7_voltage"
            )
        )

        ph920 = float(
            data.get(
                "ph920_voltage"
            )
        )

        if (
            ph4 <= 0 or
            ph7 <= 0 or
            ph920 <= 0
        ):

            raise ValueError(
                "Invalid calibration readings."
            )

        if (
            ph4 == ph7 or
            ph7 == ph920 or
            ph4 == ph920
        ):

            raise ValueError(
                "Calibration readings must be different."
            )

        status = (
            esp32_manager
            .get_status()
        )

        if not status["esp32"]["connected"]:

            emit(
                "ph_calibration_saved",
                {
                    "success":
                        False,
                    "error":
                        "ESP32 is offline."
                }
            )

            return

        message = json.dumps({
            "event":
                "save_ph_calibration",

            "ph4_voltage":
                ph4,

            "ph7_voltage":
                ph7,

            "ph920_voltage":
                ph920
        })

        success = (
            esp32_manager
            .queue_command(message)
        )

        if not success:

            emit(
                "ph_calibration_saved",
                {
                    "success":
                        False,
                    "error":
                        "Unable to communicate with ESP32."
                }
            )

            return

    except Exception as error:

        emit(
            "ph_calibration_saved",
            {
                "success":
                    False,
                "error":
                    str(error)
            }
        )


@socketio.on("save_sample")
def save_sample(data):

    try:

        required_fields = [
            "milk_type",
            "milk_volume_ml",
            "adulterant",
            "ph",
            "tds"
        ] + database.TCS_FIELDS

        for field in required_fields:

            if field not in data:

                raise ValueError(
                    f"Missing field: {field}"
                )

            if data[field] is None:

                raise ValueError(
                    f"Invalid value for {field}"
                )

        data["milk_type"] = str(
            data["milk_type"]
        ).strip()

        data["adulterant"] = str(
            data["adulterant"]
        ).strip()

        if not data["milk_type"]:

            raise ValueError(
                "Milk type is required."
            )

        milk_volume = float(
            data["milk_volume_ml"]
        )

        if milk_volume <= 0:

            raise ValueError(
                "Milk volume must be greater than zero."
            )

        data["milk_volume_ml"] = milk_volume

        adulterant_fields = [
            ("water", "mL"),
            ("urea", "tsp"),
            ("starch", "tsp"),
            ("detergent", "tsp")
        ]

        selected_names = []

        for key, fixed_unit in adulterant_fields:

            present = bool(
                int(
                    data.get(
                        f"{key}_present",
                        0
                    )
                )
            )

            data[
                f"{key}_present"
            ] = (
                1 if present else 0
            )

            if present:

                amount = data.get(
                    f"{key}_amount"
                )

                if amount is None:

                    raise ValueError(
                        f"{key.capitalize()} amount is required."
                    )

                amount = float(
                    amount
                )

                if amount <= 0:

                    raise ValueError(
                        f"{key.capitalize()} amount must be greater than zero."
                    )

                data[
                    f"{key}_amount"
                ] = amount

                data[
                    f"{key}_unit"
                ] = fixed_unit

                selected_names.append(
                    key.capitalize()
                )

            else:

                data[
                    f"{key}_amount"
                ] = None

                data[
                    f"{key}_unit"
                ] = None

        expected_adulterant = (
            " + ".join(
                selected_names
            )
            if selected_names
            else "Pure Milk"
        )

        if (
            data["adulterant"].lower()
            !=
            expected_adulterant.lower()
        ):

            data["adulterant"] = (
                expected_adulterant
            )

        data[
            "addition_amount"
        ] = None

        data[
            "addition_unit"
        ] = None

        data[
            "concentration"
        ] = None

        sample_id = (
            database.save_sample(
                data
            )
        )

        emit(
            "sample_saved",
            {
                "success":
                    True,

                "sample_id":
                    sample_id,

                "next_sample_id":
                    database.get_next_sample_id()
            }
        )

    except Exception as error:

        print(
            "Database error:",
            error
        )

        emit(
            "sample_saved",
            {
                "success":
                    False,

                "error":
                    str(error)
            }
        )


def monitor_esp32():

    while True:

        changed = (
            esp32_manager
            .check_timeout()
        )

        if changed:

            print(
                "ESP32 heartbeat timeout."
            )

            socketio.emit(
                "system_status",
                esp32_manager.get_status()
            )

        socketio.sleep(2)


if __name__ == "__main__":

    socketio.start_background_task(
        monitor_esp32
    )

    print()

    print(
        "=============================="
    )

    print(
        " MILK ADULTERATION SYSTEM"
    )

    print(
        "=============================="
    )

    print()

    print(
        "Website:"
    )

    print(
        "http://0.0.0.0:5000"
    )

    print()

    print(
        "ESP32 WebSocket:"
    )

    print(
        "ws://10.90.238.29:5000/esp32"
    )

    print()

    print(
        "Waiting for ESP32-S3..."
    )

    print()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        allow_unsafe_werkzeug=True
    )