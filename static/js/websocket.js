const socket = io({
    transports: ["polling"]
});

let esp32Online = false;

window.sensorStates = {
    ph: false,
    tds: false,
    tcs3448: false
};

socket.on("connect", function () {
    console.log("Browser connected to server:", socket.id);
});

socket.on("disconnect", function () {
    console.log("Browser disconnected from server");

    esp32Online = false;

    window.sensorStates = {
        ph: false,
        tds: false,
        tcs3448: false
    };

    if (typeof updateSystemStatus === "function") {
        updateSystemStatus({
            esp32: {
                connected: false
            },
            sensors: {
                ph: false,
                tds: false,
                tcs3448: false
            }
        });
    }
});

socket.on("system_status", function (status) {
    console.log("System status:", status);

    esp32Online = status.esp32?.connected === true;

    window.sensorStates = {
        ph: status.sensors?.ph === true,
        tds: status.sensors?.tds === true,
        tcs3448: status.sensors?.tcs3448 === true
    };

    if (typeof updateSystemStatus === "function") {
        updateSystemStatus(status);
    }
});

socket.on("command_error", function (data) {
    console.error("Sensor command error:", data);

    if (typeof showNotification === "function") {
        showNotification(
            data.message || "Unable to communicate with ESP32.",
            "error"
        );
    }
});

window.socket = socket;