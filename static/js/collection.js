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
    const adulterant = document.getElementById("adulterant").value;
    const amount = document.getElementById("addition-amount");
    const unit = document.getElementById("addition-unit");
    const note = document.getElementById("pure-milk-note");
    const amountContainer = document.getElementById("amount-field");
    const unitContainer = document.getElementById("unit-field");
    const pureMilk = adulterant === "Pure Milk";

    amountContainer.style.display = pureMilk ? "none" : "";
    unitContainer.style.display = pureMilk ? "none" : "";
    note.style.display = pureMilk ? "" : "none";

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

    if (window.sensorStates && window.sensorStates[sensor] !== true) {
        showMessage(
            sensor.toUpperCase() + " sensor is offline.",
            "error"
        );
        return;
    }

    measurementInProgress = true;
    setMeasurementButtons(true);

    showMessage(
        "Requesting " + sensor + " measurement...",
        "normal"
    );

    socket.emit("sensor_command", {
        sensor: sensor
    });
}

socket.on("sensor_result", function (data) {
    measurementInProgress = false;
    setMeasurementButtons(false);

    if (data.sensor === "ph") {
        sampleData.ph = data.value;

        document.getElementById("ph-value").textContent =
            Number(data.value).toFixed(2);
    }

    if (data.sensor === "tds") {
        sampleData.tds = data.value;

        document.getElementById("tds-value").textContent =
            Number(data.value).toFixed(1);
    }

    checkCanSave();
});

socket.on("tcs3448_result", function (data) {
    measurementInProgress = false;
    setMeasurementButtons(false);

    sampleData.tcs3448_clear = data.clear;
    sampleData.tcs3448_red = data.red;
    sampleData.tcs3448_green = data.green;
    sampleData.tcs3448_blue = data.blue;

    document.getElementById("tcs-value").textContent = "Measured";

    checkCanSave();
});

function checkCanSave() {
    const ready =
        sampleData.ph !== null &&
        sampleData.tds !== null &&
        sampleData.tcs3448_clear !== null &&
        sampleData.tcs3448_red !== null &&
        sampleData.tcs3448_green !== null &&
        sampleData.tcs3448_blue !== null;

    const button = document.getElementById("save-sample");

    button.disabled = !ready;

    if (ready) {
        showMessage(
            "All sensor measurements received. Sample can be saved.",
            "success"
        );
    }
}

function saveSample() {
    const milkType = document.getElementById("milk-type").value;
    const adulterant = document.getElementById("adulterant").value;
    const amountInput = document.getElementById("addition-amount");
    const unitInput = document.getElementById("addition-unit");

    const additionAmount = parseFloat(amountInput.value);
    const additionUnit = unitInput.value;

    if (adulterant !== "Pure Milk") {
        if (isNaN(additionAmount) || additionAmount <= 0) {
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
        milk_type: milkType,
        adulterant: adulterant,
        addition_amount: adulterant === "Pure Milk" ? null : additionAmount,
        addition_unit: adulterant === "Pure Milk" ? null : additionUnit,
        concentration: null,
        ph: sampleData.ph,
        tds: sampleData.tds,
        tcs3448_clear: sampleData.tcs3448_clear,
        tcs3448_red: sampleData.tcs3448_red,
        tcs3448_green: sampleData.tcs3448_green,
        tcs3448_blue: sampleData.tcs3448_blue
    };

    socket.emit("save_sample", data);
}

socket.on("sample_saved", function (data) {
    if (data.success) {
        showMessage(
            "Sample " + data.sample_id + " saved successfully.",
            "success"
        );

        resetMeasurement();

        if (data.next_sample_id) {
            document.getElementById("sample-id").textContent =
                data.next_sample_id;
        } else {
            loadNextSampleId();
        }
    } else {
        showMessage(
            data.error || "Failed to save sample.",
            "error"
        );
    }
});

socket.on("command_error", function (data) {
    measurementInProgress = false;
    setMeasurementButtons(false);

    showMessage(
        data.message || "Sensor command failed.",
        "error"
    );
});

function resetMeasurement() {
    sampleData = {
        ph: null,
        tds: null,
        tcs3448_clear: null,
        tcs3448_red: null,
        tcs3448_green: null,
        tcs3448_blue: null
    };

    document.getElementById("ph-value").textContent = "--";
    document.getElementById("tds-value").textContent = "--";
    document.getElementById("tcs-value").textContent = "--";
    document.getElementById("save-sample").disabled = true;

    measurementInProgress = false;

    setMeasurementButtons(false);
}

function setMeasurementButtons(disabled) {
    const buttons = [
        document.getElementById("measure-ph"),
        document.getElementById("measure-tds"),
        document.getElementById("measure-tcs")
    ];

    buttons.forEach(button => {
        if (button) {
            button.disabled = disabled;
        }
    });
}