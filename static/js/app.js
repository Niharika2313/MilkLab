document.addEventListener("DOMContentLoaded", function () {
    updateClock();
    setInterval(updateClock, 1000);

    highlightCurrentPage();

    // Get the current ESP32 status immediately
    refreshSystemStatus();

    // Keep website status synchronized with Flask
    setInterval(refreshSystemStatus, 2000);
});


// --------------------------------------------------
// Clock
// --------------------------------------------------

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


// --------------------------------------------------
// Current page
// --------------------------------------------------

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


// --------------------------------------------------
// Get system status from Flask
// --------------------------------------------------

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


// --------------------------------------------------
// Update ESP32 + sensor status everywhere
// --------------------------------------------------

function updateSystemStatus(status) {

    const esp32Connected =
        status.esp32 &&
        status.esp32.connected === true;


    // ----------------------------------------------
    // Update global ESP32 state
    // ----------------------------------------------

    esp32Online = esp32Connected;


    // ----------------------------------------------
    // Update sensor states
    // ----------------------------------------------

    window.sensorStates = {

        ph: status.sensors?.ph === true,

        tds: status.sensors?.tds === true,

        tcs3448: status.sensors?.tcs3448 === true
    };


    // ----------------------------------------------
    // Top-right ESP32 status
    // ----------------------------------------------

    const topStatus =
        document.getElementById("esp32-top-status");

    const topText =
        document.getElementById("esp32-top-text");


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


    // ----------------------------------------------
    // Sidebar status
    // ----------------------------------------------

    const sidebarStatus =
        document.getElementById("sidebar-device-status");


    if (sidebarStatus) {

        if (esp32Connected) {

            sidebarStatus.textContent = "Connected";

        } else {

            sidebarStatus.textContent = "Disconnected";
        }
    }


    // ----------------------------------------------
    // Optional sensor status elements
    // ----------------------------------------------

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


// --------------------------------------------------
// Sensor status helper
// --------------------------------------------------

function updateSensorStatusElement(id, online) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = online ? "Online" : "Offline";

    element.classList.toggle("online", online);
    element.classList.toggle("offline", !online);
}