let calibrationData = {
    ph4: null,
    ph7: null,
    ph920: null
};

let calibrationVoltageData = {
    ph4: null,
    ph7: null,
    ph920: null
};

let calibrationRunningPoint = null;


document.addEventListener("DOMContentLoaded", function () {

    loadCurrentCalibration();

    updateSaveButton();

});


function loadCurrentCalibration() {

    calibrationData = {
        ph4: null,
        ph7: null,
        ph920: null
    };

    calibrationVoltageData = {
        ph4: null,
        ph7: null,
        ph920: null
    };

    calibrationRunningPoint = null;

    setLiveValue("ph4", "--");
    setLiveValue("ph7", "--");
    setLiveValue("ph920", "--");

    setStatus(
        "ph4",
        "Ready"
    );

    setStatus(
        "ph7",
        "Ready"
    );

    setStatus(
        "ph920",
        "Ready"
    );

    setCapturedText(
        "ph4",
        "Not captured"
    );

    setCapturedText(
        "ph7",
        "Not captured"
    );

    setCapturedText(
        "ph920",
        "Not captured"
    );

    setButtonState(
        "ph4",
        false
    );

    setButtonState(
        "ph7",
        false
    );

    setButtonState(
        "ph920",
        false
    );

    updateSaveButton();

    if (
        typeof socket !== "undefined"
    ) {
        socket.emit(
            "get_ph_calibration"
        );
    }
}


function requestCalibrationVoltage(point) {

    if (
        point !== "ph4" &&
        point !== "ph7" &&
        point !== "ph920"
    ) {
        return;
    }

    if (
        typeof esp32Online !== "undefined" &&
        !esp32Online
    ) {
        showCalibrationMessage(
            "ESP32 is offline. Connect the ESP32-S3 first.",
            "error"
        );

        return;
    }

    if (
        calibrationRunningPoint !== null &&
        calibrationRunningPoint !== point
    ) {
        showCalibrationMessage(
            "Another calibration point is already running.",
            "error"
        );

        return;
    }

    calibrationRunningPoint = point;

    calibrationData[point] = null;
    calibrationVoltageData[point] = null;

    setLiveValue(
        point,
        "--"
    );

    setCapturedText(
        point,
        "Measuring..."
    );

    setStatus(
        point,
        "Starting..."
    );

    setButtonState(
        point,
        true
    );

    updateSaveButton();

    socket.emit(
        "ph_calibration_measure",
        {
            point: point
        }
    );

    showCalibrationMessage(
        "Starting live pH measurement for pH " +
        getReferencePH(point) +
        " buffer...",
        "normal"
    );
}


function stopCalibration(point) {

    if (
        calibrationRunningPoint !== point
    ) {
        return;
    }

    socket.emit(
        "ph_calibration_stop",
        {
            point: point
        }
    );

    calibrationRunningPoint = null;

    setStatus(
        point,
        "Stopped"
    );

    setCapturedText(
        point,
        "Not captured"
    );

    setButtonState(
        point,
        false
    );

    showCalibrationMessage(
        "pH " +
        getReferencePH(point) +
        " calibration stopped.",
        "normal"
    );
}


function getReferencePH(point) {

    if (point === "ph4") {
        return "4.00";
    }

    if (point === "ph7") {
        return "7.00";
    }

    if (point === "ph920") {
        return "9.20";
    }

    return "--";
}


function setLiveValue(
    point,
    value
) {

    const element =
        document.getElementById(
            point + "-live"
        );

    if (!element) {
        return;
    }

    element.textContent =
        value;
}


function setStatus(
    point,
    message
) {

    const element =
        document.getElementById(
            point + "-status"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;
}


function setCapturedText(
    point,
    message
) {

    const element =
        document.getElementById(
            "current-" + point
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;
}


function setButtonState(
    point,
    running
) {

    const startButton =
        document.getElementById(
            point + "-start"
        );

    const stopButton =
        document.getElementById(
            point + "-stop"
        );

    if (startButton) {
        startButton.disabled =
            running;
    }

    if (stopButton) {
        stopButton.disabled =
            !running;
    }
}


function updateSaveButton() {

    const saveButton =
        document.getElementById(
            "save-ph-calibration"
        );

    if (!saveButton) {
        return;
    }

    const complete =
        calibrationVoltageData.ph4 !== null &&
        calibrationVoltageData.ph7 !== null &&
        calibrationVoltageData.ph920 !== null;

    saveButton.disabled =
        !complete;
}


socket.on(
    "ph_calibration_command_accepted",
    function (data) {

        const point =
            data.point;

        if (
            !point
        ) {
            return;
        }

        calibrationRunningPoint =
            point;

        setStatus(
            point,
            "Stabilizing..."
        );

        showCalibrationMessage(
            "Live pH measurement started for pH " +
            getReferencePH(point) +
            " buffer.",
            "normal"
        );
    }
);


socket.on(
    "ph_calibration_live",
    function (data) {

        const point =
            data.point;

        const pH =
            Number(data.ph);

        if (
            !point ||
            isNaN(pH)
        ) {
            return;
        }

        setLiveValue(
            point,
            pH.toFixed(2)
        );

        if (
            data.stable
        ) {

            setStatus(
                point,
                "Stable ✓"
            );

        } else {

            const stableWindows =
                Number(
                    data.stable_windows || 0
                );

            const requiredWindows =
                Number(
                    data.required_stable_windows || 3
                );

            setStatus(
                point,
                "Stabilizing... " +
                stableWindows +
                "/" +
                requiredWindows
            );
        }
    }
);


socket.on(
    "ph_calibration_captured",
    function (data) {

        const point =
            data.point;

        const pH =
            Number(data.ph);

        const voltage =
            Number(data.voltage);

        if (
            !point ||
            isNaN(pH) ||
            isNaN(voltage)
        ) {
            showCalibrationMessage(
                "Invalid calibration data received.",
                "error"
            );

            return;
        }

        calibrationData[point] =
            pH;

        calibrationVoltageData[point] =
            voltage;

        calibrationRunningPoint =
            null;

        setLiveValue(
            point,
            pH.toFixed(2)
        );

        setStatus(
            point,
            "Stable ✓"
        );

        setCapturedText(
            point,
            "Captured ✓"
        );

        setButtonState(
            point,
            false
        );

        updateSaveButton();

        showCalibrationMessage(
            "pH " +
            getReferencePH(point) +
            " calibration point captured successfully.",
            "success"
        );
    }
);


socket.on(
    "ph_calibration_stopped",
    function () {

        if (
            calibrationRunningPoint
        ) {

            setStatus(
                calibrationRunningPoint,
                "Stopped"
            );

            setButtonState(
                calibrationRunningPoint,
                false
            );
        }

        calibrationRunningPoint =
            null;
    }
);


socket.on(
    "ph_calibration_current",
    function (data) {

        if (!data) {
            return;
        }

        const ph4Voltage =
            Number(
                data.ph4_voltage
            );

        const ph7Voltage =
            Number(
                data.ph7_voltage
            );

        const ph920Voltage =
            Number(
                data.ph920_voltage
            );

        if (
            !isNaN(ph4Voltage)
        ) {
            setCapturedText(
                "ph4",
                "Saved calibration ✓"
            );
        }

        if (
            !isNaN(ph7Voltage)
        ) {
            setCapturedText(
                "ph7",
                "Saved calibration ✓"
            );
        }

        if (
            !isNaN(ph920Voltage)
        ) {
            setCapturedText(
                "ph920",
                "Saved calibration ✓"
            );
        }
    }
);


socket.on(
    "ph_calibration_error",
    function (data) {

        const message =
            data &&
            (
                data.error ||
                data.message
            );

        if (
            calibrationRunningPoint
        ) {

            setStatus(
                calibrationRunningPoint,
                "Error"
            );

            setButtonState(
                calibrationRunningPoint,
                false
            );
        }

        calibrationRunningPoint =
            null;

        showCalibrationMessage(
            message ||
            "pH calibration failed.",
            "error"
        );
    }
);


function validateCalibration() {

    if (
        calibrationVoltageData.ph4 === null ||
        calibrationVoltageData.ph7 === null ||
        calibrationVoltageData.ph920 === null
    ) {
        return {
            valid: false,
            message:
                "Complete all three calibration points first."
        };
    }

    if (
        calibrationVoltageData.ph4 <= 0 ||
        calibrationVoltageData.ph7 <= 0 ||
        calibrationVoltageData.ph920 <= 0
    ) {
        return {
            valid: false,
            message:
                "Invalid calibration readings received."
        };
    }

    if (
        calibrationVoltageData.ph4 ===
        calibrationVoltageData.ph7 ||

        calibrationVoltageData.ph7 ===
        calibrationVoltageData.ph920 ||

        calibrationVoltageData.ph4 ===
        calibrationVoltageData.ph920
    ) {
        return {
            valid: false,
            message:
                "Calibration readings must be different."
        };
    }

    return {
        valid: true
    };
}


function savePHCalibration() {

    const validation =
        validateCalibration();

    if (
        !validation.valid
    ) {

        showCalibrationMessage(
            validation.message,
            "error"
        );

        return;
    }

    if (
        typeof esp32Online !== "undefined" &&
        !esp32Online
    ) {

        showCalibrationMessage(
            "ESP32 is offline.",
            "error"
        );

        return;
    }

    const saveButton =
        document.getElementById(
            "save-ph-calibration"
        );

    if (saveButton) {
        saveButton.disabled =
            true;
    }

    socket.emit(
        "save_ph_calibration",
        {
            ph4_voltage:
                calibrationVoltageData.ph4,

            ph7_voltage:
                calibrationVoltageData.ph7,

            ph920_voltage:
                calibrationVoltageData.ph920
        }
    );

    showCalibrationMessage(
        "Saving pH calibration...",
        "normal"
    );
}


socket.on(
    "ph_calibration_saved",
    function (data) {

        const saveButton =
            document.getElementById(
                "save-ph-calibration"
            );

        if (
            !data ||
            !data.success
        ) {

            if (saveButton) {
                saveButton.disabled =
                    false;
            }

            showCalibrationMessage(
                (
                    data &&
                    (
                        data.error ||
                        data.message
                    )
                ) ||
                "Failed to save calibration.",
                "error"
            );

            return;
        }

        setCapturedText(
            "ph4",
            "Saved ✓"
        );

        setCapturedText(
            "ph7",
            "Saved ✓"
        );

        setCapturedText(
            "ph920",
            "Saved ✓"
        );

        showCalibrationMessage(
            "pH calibration saved successfully.",
            "success"
        );

        updateSaveButton();
    }
);


function resetPHCalibration() {

    calibrationData = {
        ph4: null,
        ph7: null,
        ph920: null
    };

    calibrationVoltageData = {
        ph4: null,
        ph7: null,
        ph920: null
    };

    calibrationRunningPoint =
        null;

    [
        "ph4",
        "ph7",
        "ph920"
    ].forEach(function (point) {

        setLiveValue(
            point,
            "--"
        );

        setStatus(
            point,
            "Ready"
        );

        setCapturedText(
            point,
            "Not captured"
        );

        setButtonState(
            point,
            false
        );
    });

    updateSaveButton();

    showCalibrationMessage(
        "Calibration measurements cleared.",
        "normal"
    );
}


function showCalibrationMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "calibration-message"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "message " +
        type;
}