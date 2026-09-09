let sampleData = {
    ph: null,
    tds: null,
    tcs3448_clear: null,
    tcs3448_red: null,
    tcs3448_green: null,
    tcs3448_blue: null
};

let measurementInProgress = false;

document.addEventListener("DOMContentLoaded", function () {
    loadNextSampleId();

    const adulterant = document.getElementById("adulterant");

    if (adulterant) {
        adulterant.addEventListener("change", updateAmountFields);
        updateAmountFields();
    }
});

function loadNextSampleId() {
    fetch("/api/next-sample-id")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to get sample ID");
            }

            return response.json();
        })
        .then(data => {
            const element = document.getElementById("sample-id");

            if (element) {
                element.textContent = data.sample_id;
            }
        })
        .catch(error => {
            console.error(error);

            const element = document.getElementById("sample-id");

            if (element) {
                element.textContent = "Error";
            }
        });
}

function updateAmountFields() {
    const adulterant =
        document.getElementById("adulterant").value;

    const amount =
        document.getElementById("addition-amount");

    const unit =
        document.getElementById("addition-unit");

    const note =
        document.getElementById("pure-milk-note");

    const amountContainer =
        document.getElementById("amount-field");

    const unitContainer =
        document.getElementById("unit-field");

    const pureMilk =
        adulterant === "Pure Milk";

    amountContainer.style.display =
        pureMilk ? "none" : "";

    unitContainer.style.display =
        pureMilk ? "none" : "";

    note.style.display =
        pureMilk ? "" : "none";

    if (pureMilk) {
        amount.value = "";
    }
}

function measureSensor(sensor) {
    if (!esp32Online) {
        showMessage(
            "ESP32 is offline. Connect the ESP32-S3 first.",
            "error"
        );
        return;
    }

    if (measurementInProgress) {
        showMessage(
            "Another measurement is already running.",
            "error"
        );
        return;
    }

    if (
        window.sensorStates &&
        window.sensorStates[sensor] !== true
    ) {
        showMessage(
            sensor.toUpperCase() + " sensor is offline.",
            "error"
        );
        return;
    }

    measurementInProgress = true;

    setMeasurementButtons(true);

    if (sensor === "ph" || sensor === "tds") {
        openMeasurementModal(sensor);
    }

    showMessage(
        "Requesting " + sensor + " measurement...",
        "normal"
    );

    socket.emit("sensor_command", {
        sensor: sensor
    });
}

function openMeasurementModal(sensor) {
    const modal =
        document.getElementById("measurement-modal");

    if (!modal) {
        return;
    }

    const title =
        document.getElementById("measurement-title");

    const subtitle =
        document.getElementById("measurement-subtitle");

    const status =
        document.getElementById("measurement-status-text");

    const currentValue =
        document.getElementById("measurement-current-value");

    const readingCount =
        document.getElementById("measurement-reading-count");

    const progressFill =
        document.getElementById("measurement-progress-fill");

    const range =
        document.getElementById("measurement-range");

    const stableWindows =
        document.getElementById("measurement-stable-windows");

    const log =
        document.getElementById("measurement-log");

    const complete =
        document.getElementById("measurement-complete");

    const close =
        document.getElementById("measurement-close");

    const unit =
        document.getElementById("measurement-unit");

    const secondaryLabel =
        document.getElementById("measurement-secondary-label");

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );

    if (sensor === "ph") {
        title.textContent =
            "pH Measurement";

        subtitle.textContent =
            "Stabilizing electrode...";

        status.textContent =
            "Measurement in progress";

        readingCount.textContent =
            "0 / 8";

        range.textContent =
            "--";

        stableWindows.textContent =
            "0 / 3";

        if (unit) {
            unit.textContent = "pH";
        }

        if (secondaryLabel) {
            secondaryLabel.textContent =
                "Stable Windows";
        }

        if (completeMessage) {
            completeMessage.textContent =
                "Stable pH reading confirmed successfully.";
        }
    }

    if (sensor === "tds") {
        title.textContent =
            "TDS Measurement";

        subtitle.textContent =
            "Collecting TDS readings...";

        status.textContent =
            "Measurement in progress";

        readingCount.textContent =
            "0 / 30";

        range.textContent =
            "--";

        stableWindows.textContent =
            "--";

        if (unit) {
            unit.textContent = "ppm";
        }

        if (secondaryLabel) {
            secondaryLabel.textContent =
                "Average";
        }

        if (completeMessage) {
            completeMessage.textContent =
                "TDS measurement completed successfully.";
        }
    }

    currentValue.textContent =
        "--";

    progressFill.style.width =
        "0%";

    log.innerHTML =
        "";

    complete.classList.remove(
        "active"
    );

    close.disabled =
        true;

    modal.dataset.sensor =
        sensor;

    modal.classList.add(
        "active"
    );

    addMeasurementLog(
        "Measurement started."
    );

    if (sensor === "ph") {
        addMeasurementLog(
            "Checking pH electrode stability..."
        );
    }

    if (sensor === "tds") {
        addMeasurementLog(
            "Collecting 30 TDS readings..."
        );
    }
}

function addMeasurementLog(message) {
    const log =
        document.getElementById(
            "measurement-log"
        );

    if (!log) {
        return;
    }

    const entry =
        document.createElement(
            "div"
        );

    entry.className =
        "measurement-log-entry";

    const time =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    entry.textContent =
        "[" +
        time +
        "] " +
        message;

    log.appendChild(
        entry
    );

    log.scrollTop =
        log.scrollHeight;
}

function updatePHProgress(data) {
    const currentValue =
        document.getElementById(
            "measurement-current-value"
        );

    const readingCount =
        document.getElementById(
            "measurement-reading-count"
        );

    const progressFill =
        document.getElementById(
            "measurement-progress-fill"
        );

    const range =
        document.getElementById(
            "measurement-range"
        );

    const stableWindows =
        document.getElementById(
            "measurement-stable-windows"
        );

    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const unit =
        document.getElementById(
            "measurement-unit"
        );

    const secondaryLabel =
        document.getElementById(
            "measurement-secondary-label"
        );

    if (unit) {
        unit.textContent =
            "pH";
    }

    if (secondaryLabel) {
        secondaryLabel.textContent =
            "Stable Windows";
    }

    if (currentValue) {
        currentValue.textContent =
            Number(
                data.current_ph
            ).toFixed(2);
    }

    if (readingCount) {
        readingCount.textContent =
            data.readings +
            " / " +
            data.total_readings;
    }

    if (progressFill) {
        const percentage =
            (
                data.readings /
                data.total_readings
            ) * 100;

        progressFill.style.width =
            Math.min(
                percentage,
                100
            ) + "%";
    }

    if (range) {
        range.textContent =
            Number(
                data.range
            ).toFixed(3) +
            " pH";
    }

    if (stableWindows) {
        stableWindows.textContent =
            data.stable_windows +
            " / " +
            data.required_stable_windows;
    }

    if (subtitle) {
        if (
            data.stable_windows > 0
        ) {
            subtitle.textContent =
                "Confirming stable reading...";
        } else {
            subtitle.textContent =
                "Stabilizing electrode...";
        }
    }

    addMeasurementLog(
        "pH " +
        Number(
            data.current_ph
        ).toFixed(2) +
        " | Range " +
        Number(
            data.range
        ).toFixed(3) +
        " | Stable " +
        data.stable_windows +
        "/" +
        data.required_stable_windows
    );
}

function updateTDSProgress(data) {
    const currentValue =
        document.getElementById(
            "measurement-current-value"
        );

    const readingCount =
        document.getElementById(
            "measurement-reading-count"
        );

    const progressFill =
        document.getElementById(
            "measurement-progress-fill"
        );

    const range =
        document.getElementById(
            "measurement-range"
        );

    const stableWindows =
        document.getElementById(
            "measurement-stable-windows"
        );

    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const unit =
        document.getElementById(
            "measurement-unit"
        );

    const secondaryLabel =
        document.getElementById(
            "measurement-secondary-label"
        );

    if (unit) {
        unit.textContent =
            "ppm";
    }

    if (secondaryLabel) {
        secondaryLabel.textContent =
            "Average";
    }

    if (currentValue) {
        currentValue.textContent =
            Number(
                data.current_tds
            ).toFixed(1);
    }

    if (readingCount) {
        readingCount.textContent =
            data.readings +
            " / " +
            data.total_readings;
    }

    if (progressFill) {
        const percentage =
            (
                data.readings /
                data.total_readings
            ) * 100;

        progressFill.style.width =
            Math.min(
                percentage,
                100
            ) + "%";
    }

    if (range) {
        range.textContent =
            Number(
                data.range
            ).toFixed(1) +
            " ppm";
    }

    if (stableWindows) {
        stableWindows.textContent =
            Number(
                data.average
            ).toFixed(1) +
            " ppm";
    }

    if (subtitle) {
        if (
            data.readings <
            data.total_readings
        ) {
            subtitle.textContent =
                "Collecting TDS readings...";
        } else {
            subtitle.textContent =
                "Calculating final TDS...";
        }
    }

    addMeasurementLog(
        "TDS " +
        Number(
            data.current_tds
        ).toFixed(1) +
        " ppm | Range " +
        Number(
            data.range
        ).toFixed(1) +
        " ppm | Average " +
        Number(
            data.average
        ).toFixed(1) +
        " ppm"
    );
}

function completeMeasurement(value) {
    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const status =
        document.getElementById(
            "measurement-status-text"
        );

    const finalValue =
        document.getElementById(
            "measurement-final-value"
        );

    const complete =
        document.getElementById(
            "measurement-complete"
        );

    const close =
        document.getElementById(
            "measurement-close"
        );

    const progressFill =
        document.getElementById(
            "measurement-progress-fill"
        );

    const unit =
        document.getElementById(
            "measurement-unit"
        );

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );

    if (unit) {
        unit.textContent =
            "pH";
    }

    if (completeMessage) {
        completeMessage.textContent =
            "Stable pH reading confirmed successfully.";
    }

    if (subtitle) {
        subtitle.textContent =
            "Measurement complete";
    }

    if (status) {
        status.textContent =
            "Stable reading confirmed";
    }

    if (finalValue) {
        finalValue.textContent =
            Number(
                value
            ).toFixed(2);
    }

    if (progressFill) {
        progressFill.style.width =
            "100%";
    }

    if (complete) {
        complete.classList.add(
            "active"
        );
    }

    if (close) {
        close.disabled =
            false;
    }

    addMeasurementLog(
        "Final stabilized pH: " +
        Number(
            value
        ).toFixed(2)
    );
}

function completeTDSMeasurement(value) {
    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const status =
        document.getElementById(
            "measurement-status-text"
        );

    const finalValue =
        document.getElementById(
            "measurement-final-value"
        );

    const complete =
        document.getElementById(
            "measurement-complete"
        );

    const close =
        document.getElementById(
            "measurement-close"
        );

    const progressFill =
        document.getElementById(
            "measurement-progress-fill"
        );

    const unit =
        document.getElementById(
            "measurement-unit"
        );

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );

    if (unit) {
        unit.textContent =
            "ppm";
    }

    if (completeMessage) {
        completeMessage.textContent =
            "TDS measurement completed successfully.";
    }

    if (subtitle) {
        subtitle.textContent =
            "Measurement complete";
    }

    if (status) {
        status.textContent =
            "TDS reading confirmed";
    }

    if (finalValue) {
        finalValue.textContent =
            Number(
                value
            ).toFixed(1);
    }

    if (progressFill) {
        progressFill.style.width =
            "100%";
    }

    if (complete) {
        complete.classList.add(
            "active"
        );
    }

    if (close) {
        close.disabled =
            false;
    }

    addMeasurementLog(
        "Final TDS: " +
        Number(
            value
        ).toFixed(1) +
        " ppm"
    );
}

function closeMeasurementModal() {
    const modal =
        document.getElementById(
            "measurement-modal"
        );

    if (modal) {
        modal.classList.remove(
            "active"
        );
    }
}

socket.on(
    "ph_progress",
    function (data) {
        updatePHProgress(data);
    }
);

socket.on(
    "tds_progress",
    function (data) {
        updateTDSProgress(data);
    }
);

socket.on(
    "sensor_result",
    function (data) {

        if (data.sensor === "ph") {
            sampleData.ph =
                data.value;

            document.getElementById(
                "ph-value"
            ).textContent =
                Number(
                    data.value
                ).toFixed(2);

            measurementInProgress =
                false;

            setMeasurementButtons(
                false
            );

            completeMeasurement(
                data.value
            );
        }

        if (data.sensor === "tds") {
            sampleData.tds =
                data.value;

            document.getElementById(
                "tds-value"
            ).textContent =
                Number(
                    data.value
                ).toFixed(1);

            measurementInProgress =
                false;

            setMeasurementButtons(
                false
            );

            completeTDSMeasurement(
                data.value
            );
        }

        checkCanSave();
    }
);

socket.on(
    "tcs3448_result",
    function (data) {

        measurementInProgress =
            false;

        setMeasurementButtons(
            false
        );

        sampleData.tcs3448_clear =
            data.clear;

        sampleData.tcs3448_red =
            data.red;

        sampleData.tcs3448_green =
            data.green;

        sampleData.tcs3448_blue =
            data.blue;

        document.getElementById(
            "tcs-value"
        ).textContent =
            "Measured";

        checkCanSave();
    }
);

socket.on(
    "sensor_error",
    function (data) {

        measurementInProgress =
            false;

        setMeasurementButtons(
            false
        );

        const close =
            document.getElementById(
                "measurement-close"
            );

        if (close) {
            close.disabled =
                false;
        }

        addMeasurementLog(
            "ERROR: " +
            (
                data.message ||
                "Sensor measurement failed."
            )
        );

        const subtitle =
            document.getElementById(
                "measurement-subtitle"
            );

        const status =
            document.getElementById(
                "measurement-status-text"
            );

        if (subtitle) {
            subtitle.textContent =
                "Measurement failed";
        }

        if (status) {
            status.textContent =
                "Unable to complete measurement";
        }

        showMessage(
            data.message ||
            "Sensor measurement failed.",
            "error"
        );
    }
);

socket.on(
    "command_error",
    function (data) {

        measurementInProgress =
            false;

        setMeasurementButtons(
            false
        );

        const modal =
            document.getElementById(
                "measurement-modal"
            );

        if (modal) {
            modal.classList.remove(
                "active"
            );
        }

        showMessage(
            data.message ||
            "Sensor command failed.",
            "error"
        );
    }
);

socket.on(
    "command_accepted",
    function (data) {

        if (
            data.sensor === "ph" ||
            data.sensor === "tds"
        ) {
            addMeasurementLog(
                "Command received by ESP32."
            );
        }
    }
);

function checkCanSave() {
    const ready =
        sampleData.ph !== null &&
        sampleData.tds !== null &&
        sampleData.tcs3448_clear !== null &&
        sampleData.tcs3448_red !== null &&
        sampleData.tcs3448_green !== null &&
        sampleData.tcs3448_blue !== null;

    const button =
        document.getElementById(
            "save-sample"
        );

    button.disabled =
        !ready;

    if (ready) {
        showMessage(
            "All sensor measurements received. Sample can be saved.",
            "success"
        );
    }
}

function saveSample() {
    const milkType =
        document.getElementById(
            "milk-type"
        ).value;

    const adulterant =
        document.getElementById(
            "adulterant"
        ).value;

    const amountInput =
        document.getElementById(
            "addition-amount"
        );

    const unitInput =
        document.getElementById(
            "addition-unit"
        );

    const additionAmount =
        parseFloat(
            amountInput.value
        );

    const additionUnit =
        unitInput.value;

    if (
        adulterant !== "Pure Milk"
    ) {
        if (
            isNaN(additionAmount) ||
            additionAmount <= 0
        ) {
            showMessage(
                "Enter a valid addition amount.",
                "error"
            );

            return;
        }

        if (!additionUnit) {
            showMessage(
                "Select the addition unit.",
                "error"
            );

            return;
        }
    }

    const data = {
        milk_type:
            milkType,

        adulterant:
            adulterant,

        addition_amount:
            adulterant === "Pure Milk"
                ? null
                : additionAmount,

        addition_unit:
            adulterant === "Pure Milk"
                ? null
                : additionUnit,

        concentration:
            null,

        ph:
            sampleData.ph,

        tds:
            sampleData.tds,

        tcs3448_clear:
            sampleData.tcs3448_clear,

        tcs3448_red:
            sampleData.tcs3448_red,

        tcs3448_green:
            sampleData.tcs3448_green,

        tcs3448_blue:
            sampleData.tcs3448_blue
    };

    socket.emit(
        "save_sample",
        data
    );
}

socket.on(
    "sample_saved",
    function (data) {

        if (data.success) {

            showMessage(
                "Sample " +
                data.sample_id +
                " saved successfully.",
                "success"
            );

            resetMeasurement();

            if (data.next_sample_id) {

                document.getElementById(
                    "sample-id"
                ).textContent =
                    data.next_sample_id;

            } else {

                loadNextSampleId();
            }

        } else {

            showMessage(
                data.error ||
                "Failed to save sample.",
                "error"
            );
        }
    }
);

function resetMeasurement() {

    sampleData = {
        ph: null,
        tds: null,
        tcs3448_clear: null,
        tcs3448_red: null,
        tcs3448_green: null,
        tcs3448_blue: null
    };

    document.getElementById(
        "ph-value"
    ).textContent =
        "--";

    document.getElementById(
        "tds-value"
    ).textContent =
        "--";

    document.getElementById(
        "tcs-value"
    ).textContent =
        "--";

    document.getElementById(
        "save-sample"
    ).disabled =
        true;

    measurementInProgress =
        false;

    setMeasurementButtons(
        false
    );
}

function setMeasurementButtons(
    disabled
) {

    const buttons = [
        document.getElementById(
            "measure-ph"
        ),

        document.getElementById(
            "measure-tds"
        ),

        document.getElementById(
            "measure-tcs"
        )
    ];

    buttons.forEach(
        button => {

            if (button) {
                button.disabled =
                    disabled;
            }
        }
    );
}