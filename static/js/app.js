document.addEventListener("DOMContentLoaded", function () {
    updateClock();
    setInterval(updateClock, 1000);

    highlightCurrentPage();
    refreshSystemStatus();
    setInterval(refreshSystemStatus, 2000);
});

function updateClock() {
    const element = document.getElementById("system-time");

    if (!element) {
        return;
    }

    const now = new Date();

    element.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function highlightCurrentPage() {
    const path = window.location.pathname;

    document.querySelectorAll(".nav-item").forEach(item => {
        const href = item.getAttribute("href");

        if (href === path) {
            item.classList.add("active");
        }
    });

    const page = document.getElementById("current-page");

    if (!page) {
        return;
    }

    const names = {
        "/": "Dashboard",
        "/collection": "Data Collection",
        "/dataset": "Dataset",
        "/analytics": "Analytics",
        "/sensors": "Sensors",
        "/calibration": "Calibration",
        "/analyze": "Analyze Milk"
    };

    page.textContent = names[path] || "MilkLab";
}

function refreshSystemStatus() {
    fetch("/api/status")
        .then(response => {
            if (!response.ok) {
                throw new Error("Status request failed");
            }

            return response.json();
        })
        .then(status => {
            console.log("System status from Flask:", status);
            updateSystemStatus(status);
        })
        .catch(error => {
            console.error("Unable to get system status:", error);

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
        });
}

function updateSystemStatus(status) {
    const esp32Connected =
        status.esp32 &&
        status.esp32.connected === true;

    esp32Online = esp32Connected;

    window.sensorStates = {
        ph: status.sensors?.ph === true,
        tds: status.sensors?.tds === true,
        tcs3448: status.sensors?.tcs3448 === true
    };

    const topStatus = document.getElementById("esp32-top-status");
    const topText = document.getElementById("esp32-top-text");

    if (topStatus && topText) {
        if (esp32Connected) {
            topStatus.classList.remove("offline");
            topStatus.classList.add("online");
            topText.textContent = "ESP32 Online";
        } else {
            topStatus.classList.remove("online");
            topStatus.classList.add("offline");
            topText.textContent = "ESP32 Offline";
        }
    }

    const sidebarStatus = document.getElementById("sidebar-device-status");

    if (sidebarStatus) {
        sidebarStatus.textContent =
            esp32Connected ? "Connected" : "Disconnected";
    }

    updateSensorStatusElement(
        "ph-status",
        window.sensorStates.ph
    );

    updateSensorStatusElement(
        "tds-status",
        window.sensorStates.tds
    );

    updateSensorStatusElement(
        "tcs3448-status",
        window.sensorStates.tcs3448
    );
}

function updateSensorStatusElement(id, online) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = online ? "Online" : "Offline";
    element.classList.toggle("online", online);
    element.classList.toggle("offline", !online);
}

function showMessage(message, type = "normal") {
    const element = document.getElementById("collection-message");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "message " + type;
}