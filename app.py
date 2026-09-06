import os
import json

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
    return jsonify(esp32_manager.get_status())


@app.route("/api/next-sample-id")
def next_sample_id():
    return jsonify({
        "sample_id": database.get_next_sample_id()
    })


@app.route("/api/samples")
def samples():
    return jsonify(database.get_all_samples())


@app.route("/api/samples/<sample_id>", methods=["DELETE"])
def delete_sample(sample_id):
    success = database.delete_sample(sample_id)

    return jsonify({
        "success": success
    })


@app.route("/api/export")
def export_dataset():
    filepath = database.export_csv()

    if not os.path.exists(filepath):
        return jsonify({
            "error": "No dataset available"
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

    try:
        while True:
            message = ws.receive()

            if message is None:
                break

            print("ESP32 → Server:", message)

            try:
                data = json.loads(message)
            except Exception:
                print("Invalid JSON from ESP32.")
                continue

            event = data.get("event")

            if event == "esp32_connect":

                device_id = data.get("device_id")
                ip_address = data.get("ip")
                firmware = data.get("firmware")

                print("Device ID:", device_id)
                print("IP:", ip_address)
                print("Firmware:", firmware)

                esp32_manager.device_connected(
                    device_id=device_id,
                    ip_address=ip_address,
                    firmware_version=firmware,
                    websocket=current_ws
                )

                print("ESP32 marked as ONLINE.")

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

                ws.send(json.dumps({
                    "event": "server_connected",
                    "message": "MilkLab server connected"
                }))

            elif event == "esp32_heartbeat":

                esp32_manager.heartbeat()

            elif event == "esp32_sensor_status":

                sensor = data.get("sensor")
                online = data.get("online", False)

                esp32_manager.update_sensor_status(
                    sensor,
                    online
                )

                socketio.emit(
                    "system_status",
                    esp32_manager.get_status()
                )

            elif event == "sensor_result":

                sensor = data.get("sensor")
                value = data.get("value")

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

    except Exception as error:
        print("ESP32 WebSocket error:", error)

    finally:
        print("ESP32 WebSocket disconnected.")

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
    print("Browser connected:", request.sid)

    emit(
        "system_status",
        esp32_manager.get_status()
    )


@socketio.on("disconnect")
def browser_disconnect():
    print("Browser disconnected:", request.sid)


@socketio.on("esp32_connect")
def old_esp32_connect(data):
    print("Legacy ESP32 Socket.IO event received:", data)


@socketio.on("esp32_heartbeat")
def old_esp32_heartbeat():
    esp32_manager.heartbeat()

    socketio.emit(
        "system_status",
        esp32_manager.get_status()
    )


@socketio.on("esp32_sensor_status")
def old_esp32_sensor_status(data):
    sensor = data.get("sensor")
    online = data.get("online", False)

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

    sensor = data.get("sensor")

    status = esp32_manager.get_status()

    if not status["esp32"]["connected"]:
        emit(
            "command_error",
            {
                "message": "ESP32 is offline."
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
                "message": "Unknown sensor."
            }
        )
        return

    message = json.dumps({
        "event": "measure_sensor",
        "sensor": sensor
    })

    print("Server → ESP32:", message)

    success = esp32_manager.send_to_esp32(message)

    if not success:
        emit(
            "command_error",
            {
                "message": "Unable to communicate with ESP32."
            }
        )


@socketio.on("save_sample")
def save_sample(data):

    try:

        required_fields = [
            "milk_type",
            "adulterant",
            "ph",
            "tds",
            "tcs3448_clear",
            "tcs3448_red",
            "tcs3448_green",
            "tcs3448_blue"
        ]

        for field in required_fields:

            if field not in data:
                raise ValueError(
                    f"Missing field: {field}"
                )

        if data["adulterant"] == "Pure Milk":

            data["addition_amount"] = None
            data["addition_unit"] = None

        else:

            amount = data.get("addition_amount")
            unit = data.get("addition_unit")

            if amount is None:
                raise ValueError(
                    "Addition amount is required."
                )

            if not unit:
                raise ValueError(
                    "Addition unit is required."
                )

            if float(amount) <= 0:
                raise ValueError(
                    "Addition amount must be greater than zero."
                )

        sample_id = database.save_sample(data)

        emit(
            "sample_saved",
            {
                "success": True,
                "sample_id": sample_id,
                "next_sample_id":
                    database.get_next_sample_id()
            }
        )

    except Exception as error:

        print("Database error:", error)

        emit(
            "sample_saved",
            {
                "success": False,
                "error": str(error)
            }
        )


def monitor_esp32():

    while True:

        changed = esp32_manager.check_timeout()

        if changed:

            print("ESP32 heartbeat timeout.")

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
    print("==============================")
    print(" MILK ADULTERATION SYSTEM")
    print("==============================")
    print()
    print("Website:")
    print("http://0.0.0.0:5000")
    print()
    print("ESP32 WebSocket:")
    print("ws://10.90.238.29:5000/esp32")
    print()
    print("Waiting for ESP32-S3...")
    print()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        allow_unsafe_werkzeug=True
    )