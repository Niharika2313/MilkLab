let sampleData = {
    ph: null,
    tds: null,
    tcs3448_f1: null,
    tcs3448_f2: null,
    tcs3448_fz: null,
    tcs3448_f3: null,
    tcs3448_f4: null,
    tcs3448_f5: null,
    tcs3448_fy: null,
    tcs3448_fxl: null,
    tcs3448_f6: null,
    tcs3448_f7: null,
    tcs3448_f8: null,
    tcs3448_nir: null,
    tcs3448_clear: null,
    tcs3448_flicker: null
};

let measurementInProgress = false;

document.addEventListener("DOMContentLoaded", function () {
    loadNextSampleId();

    const milkType = document.getElementById("milk-type");
    const milkVolume = document.getElementById("milk-volume-ml");

    if (milkType) {
        milkType.addEventListener("input", checkCanSave);
        milkType.addEventListener("change", checkCanSave);
    }

    if (milkVolume) {
        milkVolume.addEventListener("input", checkCanSave);
        milkVolume.addEventListener("change", checkCanSave);
    }

    getAdulterantDefinitions().forEach(item => {
        const checkbox = document.getElementById(item.checkbox);
        const amount = document.getElementById(item.amount);

        if (checkbox) {
            checkbox.addEventListener(
                "change",
                updateAdulterantFields
            );
        }

        if (amount) {
            amount.addEventListener(
                "input",
                checkCanSave
            );

            amount.addEventListener(
                "change",
                checkCanSave
            );
        }
    });

    updateAdulterantFields();
    checkCanSave();
});


function loadNextSampleId() {

    fetch("/api/next-sample-id")
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    "Failed to get sample ID"
                );
            }

            return response.json();
        })

        .then(data => {

            const element =
                document.getElementById(
                    "sample-id"
                );

            if (element) {
                element.textContent =
                    data.sample_id;
            }
        })

        .catch(error => {

            console.error(error);

            const element =
                document.getElementById(
                    "sample-id"
                );

            if (element) {
                element.textContent = "Error";
            }
        });
}


// ============================================================
// ADULTERANT DEFINITIONS
// ============================================================

function getAdulterantDefinitions() {

    return [

        {
            name: "Water",
            key: "water",
            checkbox: "water-present",
            amount: "water-amount",
            unit: "water-unit",
            fixedUnit: "mL",
            fields: "water-fields"
        },

        {
            name: "Urea",
            key: "urea",
            checkbox: "urea-present",
            amount: "urea-amount",
            unit: "urea-unit",
            fixedUnit: "tsp",
            fields: "urea-fields"
        },

        {
            name: "Starch",
            key: "starch",
            checkbox: "starch-present",
            amount: "starch-amount",
            unit: "starch-unit",
            fixedUnit: "tsp",
            fields: "starch-fields"
        },

        {
            name: "Detergent",
            key: "detergent",
            checkbox: "detergent-present",
            amount: "detergent-amount",
            unit: "detergent-unit",
            fixedUnit: "tsp",
            fields: "detergent-fields"
        }
    ];
}


// ============================================================
// UPDATE ADULTERANT FIELDS
// ============================================================

function updateAdulterantFields() {

    const definitions =
        getAdulterantDefinitions();

    let anySelected = false;

    definitions.forEach(item => {

        const checkbox =
            document.getElementById(
                item.checkbox
            );

        const fields =
            document.getElementById(
                item.fields
            );

        const amount =
            document.getElementById(
                item.amount
            );

        const unit =
            document.getElementById(
                item.unit
            );

        const selected =
            checkbox &&
            checkbox.checked;

        if (selected) {
            anySelected = true;
        }

        if (fields) {
            fields.style.display =
                selected
                    ? "flex"
                    : "none";
        }

        if (!selected && amount) {
            amount.value = "";
        }

        if (unit) {
            unit.value =
                item.fixedUnit;
        }
    });

    const note =
        document.getElementById(
            "pure-milk-note"
        );

    if (note) {
        note.style.display =
            anySelected
                ? "none"
                : "";
    }

    checkCanSave();
}


function getSelectedAdulterants() {

    return getAdulterantDefinitions()
        .filter(item => {

            const checkbox =
                document.getElementById(
                    item.checkbox
                );

            return (
                checkbox &&
                checkbox.checked
            );
        });
}


// ============================================================
// VALIDATE ADULTERANTS
// ============================================================

function validateAdulterants() {

    const selected =
        getSelectedAdulterants();

    for (const item of selected) {

        const amountElement =
            document.getElementById(
                item.amount
            );

        if (!amountElement) {

            return {
                valid: false,
                message:
                    item.name +
                    " amount field is missing."
            };
        }

        const amount =
            parseFloat(
                amountElement.value
            );

        if (
            isNaN(amount) ||
            amount <= 0
        ) {

            return {
                valid: false,
                message:
                    "Enter a valid amount for " +
                    item.name +
                    "."
            };
        }

        const unitElement =
            document.getElementById(
                item.unit
            );

        if (unitElement) {
            unitElement.value =
                item.fixedUnit;
        }
    }

    return {
        valid: true
    };
}


// ============================================================
// GET ADULTERANT DATA
// ============================================================

function getAdulterantData() {

    const definitions =
        getAdulterantDefinitions();

    const selected =
        getSelectedAdulterants();

    const names =
        selected.map(
            item => item.name
        );

    const result = {

        adulterant:
            names.length > 0
                ? names.join(" + ")
                : "Pure Milk",

        water_present: 0,
        urea_present: 0,
        starch_present: 0,
        detergent_present: 0,

        water_amount: null,
        water_unit: null,

        urea_amount: null,
        urea_unit: null,

        starch_amount: null,
        starch_unit: null,

        detergent_amount: null,
        detergent_unit: null
    };

    definitions.forEach(item => {

        const checkbox =
            document.getElementById(
                item.checkbox
            );

        if (
            !checkbox ||
            !checkbox.checked
        ) {
            return;
        }

        result[
            item.key + "_present"
        ] = 1;

        const amountElement =
            document.getElementById(
                item.amount
            );

        result[
            item.key + "_amount"
        ] =
            parseFloat(
                amountElement.value
            );

        result[
            item.key + "_unit"
        ] =
            item.fixedUnit;
    });

    return result;
}


// ============================================================
// MEASURE SENSOR
// ============================================================

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
            sensor.toUpperCase() +
            " sensor is offline.",
            "error"
        );

        return;
    }

    measurementInProgress =
        true;

    setMeasurementButtons(
        true
    );

    if (
        sensor === "ph" ||
        sensor === "tds"
    ) {

        openMeasurementModal(
            sensor
        );
    }

    showMessage(
        "Requesting " +
        sensor +
        " measurement...",
        "normal"
    );

    socket.emit(
        "sensor_command",
        {
            sensor: sensor
        }
    );
}


// ============================================================
// OPEN MEASUREMENT MODAL
// ============================================================

function openMeasurementModal(sensor) {

    const modal =
        document.getElementById(
            "measurement-modal"
        );

    if (!modal) {
        return;
    }

    const title =
        document.getElementById(
            "measurement-title"
        );

    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const status =
        document.getElementById(
            "measurement-status-text"
        );

    const currentValue =
        document.getElementById(
            "measurement-current-value"
        );

    const currentUnit =
        document.getElementById(
            "measurement-current-unit"
        );

    const finalUnit =
        document.getElementById(
            "measurement-final-unit"
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

    const secondaryLabel =
        document.getElementById(
            "measurement-stability-label"
        );

    const log =
        document.getElementById(
            "measurement-log"
        );

    const complete =
        document.getElementById(
            "measurement-complete"
        );

    const close =
        document.getElementById(
            "measurement-close"
        );

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );

    if (currentValue) {
        currentValue.textContent =
            "--";
    }

    if (readingCount) {
        readingCount.textContent =
            "0 / 0";
    }

    if (progressFill) {
        progressFill.style.width =
            "0%";
    }

    if (range) {
        range.textContent =
            "--";
    }

    if (stableWindows) {
        stableWindows.textContent =
            "--";
    }

    if (log) {
        log.innerHTML =
            "";
    }

    if (complete) {
        complete.classList.remove(
            "active"
        );
    }

    if (close) {
        close.disabled =
            true;
    }

    if (sensor === "ph") {

        if (title) {
            title.textContent =
                "pH Measurement";
        }

        if (subtitle) {
            subtitle.textContent =
                "Stabilizing electrode...";
        }

        if (status) {
            status.textContent =
                "Measurement in progress";
        }

        if (readingCount) {
            readingCount.textContent =
                "0 / 8";
        }

        if (stableWindows) {
            stableWindows.textContent =
                "0 / 3";
        }

        if (currentUnit) {
            currentUnit.textContent =
                "pH";
        }

        if (finalUnit) {
            finalUnit.textContent =
                "pH";
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

        if (title) {
            title.textContent =
                "TDS Measurement";
        }

        if (subtitle) {
            subtitle.textContent =
                "Collecting TDS readings...";
        }

        if (status) {
            status.textContent =
                "Measurement in progress";
        }

        if (readingCount) {
            readingCount.textContent =
                "0 / 30";
        }

        if (stableWindows) {
            stableWindows.textContent =
                "--";
        }

        if (currentUnit) {
            currentUnit.textContent =
                "ppm";
        }

        if (finalUnit) {
            finalUnit.textContent =
                "ppm";
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


// ============================================================
// MEASUREMENT LOG
// ============================================================

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


// ============================================================
// pH PROGRESS
// ============================================================

function updatePHProgress(data) {

    const currentValue =
        document.getElementById(
            "measurement-current-value"
        );

    const phDashboardValue =
        document.getElementById(
            "ph-value"
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
            "measurement-current-unit"
        );

    const secondaryLabel =
        document.getElementById(
            "measurement-stability-label"
        );


    if (unit) {
        unit.textContent =
            "pH";
    }


    if (secondaryLabel) {
        secondaryLabel.textContent =
            "Stable Windows";
    }


    /*
     * IMPORTANT:
     *
     * The ESP32 sends an initial progress packet
     * with:
     *
     * current_ph = 0
     * readings   = 0
     *
     * That is NOT a real pH measurement.
     *
     * Therefore ignore it.
     */


    if (
        currentValue &&
        data.current_ph !== undefined &&
        Number(data.readings) > 0
    ) {

        const livePH =
            Number(
                data.current_ph
            );

        if (
            Number.isFinite(
                livePH
            )
        ) {

            currentValue.textContent =
                livePH.toFixed(2);
        }
    }


    /*
     * LIVE pH ON MAIN COLLECTION PAGE
     *
     * This updates the displayed pH
     * immediately without changing
     * sampleData.ph.
     */


    if (
        phDashboardValue &&
        data.current_ph !== undefined &&
        Number(data.readings) > 0
    ) {

        const livePH =
            Number(
                data.current_ph
            );

        if (
            Number.isFinite(
                livePH
            )
        ) {

            phDashboardValue.textContent =
                livePH.toFixed(2);
        }
    }


    if (
        readingCount &&
        data.readings !== undefined &&
        data.total_readings !== undefined
    ) {

        readingCount.textContent =
            data.readings +
            " / " +
            data.total_readings;
    }


    if (
        progressFill &&
        data.total_readings
    ) {

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


    if (
        range &&
        data.range !== undefined
    ) {

        const phRange =
            Number(
                data.range
            );

        if (
            Number.isFinite(
                phRange
            )
        ) {

            range.textContent =
                phRange.toFixed(3) +
                " pH";
        }
    }


    if (
        stableWindows &&
        data.stable_windows !== undefined
    ) {

        stableWindows.textContent =
            data.stable_windows +
            " / " +
            data.required_stable_windows;
    }


    if (subtitle) {

        subtitle.textContent =
            data.stable_windows > 0
                ? "Confirming stable reading..."
                : "Stabilizing electrode...";
    }


    /*
     * Add log only for a real reading.
     */
    if (
        data.current_ph !== undefined &&
        Number(data.readings) > 0
    ) {

        const livePH =
            Number(
                data.current_ph
            );

        if (
            Number.isFinite(
                livePH
            )
        ) {

            let message =
                "pH " +
                livePH.toFixed(2);

            if (
                data.range !== undefined
            ) {

                const phRange =
                    Number(
                        data.range
                    );

                if (
                    Number.isFinite(
                        phRange
                    )
                ) {

                    message +=
                        " | Range " +
                        phRange.toFixed(3);
                }
            }

            if (
                data.stable_windows !== undefined &&
                data.required_stable_windows !== undefined
            ) {

                message +=
                    " | Stable " +
                    data.stable_windows +
                    "/" +
                    data.required_stable_windows;
            }

            addMeasurementLog(
                message
            );
        }
    }
}


// ============================================================
// TDS PROGRESS
// ============================================================

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

    const average =
        document.getElementById(
            "measurement-stable-windows"
        );

    const subtitle =
        document.getElementById(
            "measurement-subtitle"
        );

    const unit =
        document.getElementById(
            "measurement-current-unit"
        );

    const secondaryLabel =
        document.getElementById(
            "measurement-stability-label"
        );


    if (unit) {
        unit.textContent =
            "ppm";
    }


    if (secondaryLabel) {
        secondaryLabel.textContent =
            "Average";
    }


    if (
        data.current_tds !== undefined &&
        currentValue
    ) {

        currentValue.textContent =
            Number(
                data.current_tds
            ).toFixed(1);
    }


    if (
        data.readings !== undefined &&
        data.total_readings !== undefined
    ) {

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
    }


    if (
        data.range !== undefined &&
        range
    ) {

        range.textContent =
            Number(
                data.range
            ).toFixed(1) +
            " ppm";
    }


    if (
        data.average !== undefined &&
        average
    ) {

        average.textContent =
            Number(
                data.average
            ).toFixed(1) +
            " ppm";
    }


    if (subtitle) {

        subtitle.textContent =
            data.readings <
            data.total_readings
                ? "Collecting TDS readings..."
                : "Calculating final TDS...";
    }


    if (
        data.current_tds !== undefined
    ) {

        let message =
            "TDS " +
            Number(
                data.current_tds
            ).toFixed(1) +
            " ppm";


        if (
            data.range !== undefined
        ) {

            message +=
                " | Range " +
                Number(
                    data.range
                ).toFixed(1) +
                " ppm";
        }


        if (
            data.average !== undefined
        ) {

            message +=
                " | Average " +
                Number(
                    data.average
                ).toFixed(1) +
                " ppm";
        }


        addMeasurementLog(
            message
        );
    }
}


// ============================================================
// COMPLETE pH MEASUREMENT
// ============================================================

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

    const finalUnit =
        document.getElementById(
            "measurement-final-unit"
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
            "measurement-current-unit"
        );

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );


    if (unit) {
        unit.textContent =
            "pH";
    }


    if (finalUnit) {
        finalUnit.textContent =
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


// ============================================================
// COMPLETE TDS MEASUREMENT
// ============================================================

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

    const finalUnit =
        document.getElementById(
            "measurement-final-unit"
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
            "measurement-current-unit"
        );

    const completeMessage =
        document.getElementById(
            "measurement-complete-message"
        );

    const tdsValue =
        document.getElementById(
            "tds-value"
        );

    const finalTDS =
        Number(
            value
        );


    if (unit) {
        unit.textContent =
            "ppm";
    }


    if (finalUnit) {
        finalUnit.textContent =
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
            finalTDS.toFixed(1);
    }


    if (tdsValue) {
        tdsValue.textContent =
            finalTDS.toFixed(1) +
            " ppm";
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
        finalTDS.toFixed(1) +
        " ppm"
    );
}


// ============================================================
// CLOSE MEASUREMENT MODAL
// ============================================================

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


// ============================================================
// pH PROGRESS SOCKET
// ============================================================

socket.on(
    "ph_progress",
    function (data) {

        updatePHProgress(
            data
        );
    }
);


// ============================================================
// TDS PROGRESS SOCKET
// ============================================================

socket.on(
    "tds_progress",
    function (data) {

        updateTDSProgress(
            data
        );
    }
);


// ============================================================
// SENSOR RESULT
// ============================================================

socket.on(
    "sensor_result",
    function (data) {

        console.log(
            "Sensor result:",
            data
        );


        // ==================== pH ====================

        if (
            data.sensor === "ph"
        ) {

            /*
             * ONLY THE FINAL STABILIZED
             * pH IS STORED AS sampleData.ph
             */
            sampleData.ph =
                Number(
                    data.value
                );


            const phElement =
                document.getElementById(
                    "ph-value"
                );


            if (phElement) {

                phElement.textContent =
                    Number(
                        data.value
                    ).toFixed(2);
            }


            measurementInProgress =
                false;


            setMeasurementButtons(
                false
            );


            completeMeasurement(
                data.value
            );
        }


        // ==================== TDS ====================

        if (
            data.sensor === "tds"
        ) {

            sampleData.tds =
                Number(
                    data.value
                );


            const tdsElement =
                document.getElementById(
                    "tds-value"
                );


            if (tdsElement) {

                tdsElement.textContent =
                    Number(
                        data.value
                    ).toFixed(1) +
                    " ppm";
            }


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


// ============================================================
// TCS3448 RESULT
// ============================================================

socket.on(
    "tcs3448_result",
    function (data) {

        console.log(
            "TCS3448 result:",
            data
        );


        measurementInProgress =
            false;


        setMeasurementButtons(
            false
        );


        const channels = [

            "f1",
            "f2",
            "fz",
            "f3",
            "f4",
            "f5",
            "fy",
            "fxl",
            "f6",
            "f7",
            "f8",
            "nir",
            "clear",
            "flicker"
        ];


        let validResult =
            true;


        channels.forEach(
            channel => {

                const value =
                    Number(
                        data[channel]
                    );


                if (
                    !Number.isFinite(
                        value
                    )
                ) {

                    validResult =
                        false;

                    return;
                }


                sampleData[
                    "tcs3448_" +
                    channel
                ] =
                    value;


                const element =
                    document.getElementById(
                        "tcs-" +
                        channel
                    );


                if (element) {

                    element.textContent =
                        value.toFixed(0);
                }
            }
        );


        if (!validResult) {

            showMessage(
                "TCS3448 measurement received invalid data.",
                "error"
            );

            checkCanSave();

            return;
        }


        const tcsValue =
            document.getElementById(
                "tcs-value"
            );


        if (tcsValue) {
            tcsValue.textContent =
                "Measured";
        }


        showMessage(
            "TCS3448 measurement completed successfully.",
            "success"
        );


        checkCanSave();
    }
);


// ============================================================
// SENSOR ERROR
// ============================================================

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


        checkCanSave();
    }
);


// ============================================================
// COMMAND ERROR
// ============================================================

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


        checkCanSave();
    }
);


// ============================================================
// COMMAND ACCEPTED
// ============================================================

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


// ============================================================
// CHECK CAN SAVE
// ============================================================

function checkCanSave() {

    const milkType =
        document.getElementById(
            "milk-type"
        );

    const milkVolume =
        document.getElementById(
            "milk-volume-ml"
        );


    const milkReady =
        milkType &&
        milkType.value.trim() !== "";


    const volumeValue =
        milkVolume
            ? parseFloat(
                milkVolume.value
            )
            : NaN;


    const milkVolumeReady =
        Number.isFinite(
            volumeValue
        ) &&
        volumeValue > 0;


    const adulterantValidation =
        validateAdulterants();


    const tcsChannels = [

        "f1",
        "f2",
        "fz",
        "f3",
        "f4",
        "f5",
        "fy",
        "fxl",
        "f6",
        "f7",
        "f8",
        "nir",
        "clear",
        "flicker"
    ];


    const pHReady =
        sampleData.ph !== null &&
        Number.isFinite(
            sampleData.ph
        );


    const tdsReady =
        sampleData.tds !== null &&
        Number.isFinite(
            sampleData.tds
        );


    const tcsReady =
        tcsChannels.every(
            channel => {

                const value =
                    sampleData[
                        "tcs3448_" +
                        channel
                    ];


                return (
                    value !== null &&
                    Number.isFinite(
                        value
                    )
                );
            }
        );


    const ready =
        milkReady &&
        milkVolumeReady &&
        adulterantValidation.valid &&
        pHReady &&
        tdsReady &&
        tcsReady;


    const button =
        document.getElementById(
            "save-sample"
        );


    if (button) {

        button.disabled =
            !ready;
    }


    if (ready) {

        showMessage(
            "All sample information and sensor measurements are ready. Sample can be saved.",
            "success"
        );
    }
}


// ============================================================
// SAVE SAMPLE
// ============================================================

function saveSample() {

    const milkTypeElement =
        document.getElementById(
            "milk-type"
        );


    const milkType =
        milkTypeElement
            ? milkTypeElement.value.trim()
            : "";


    if (!milkType) {

        showMessage(
            "Enter the milk type.",
            "error"
        );

        return;
    }


    const milkVolumeElement =
        document.getElementById(
            "milk-volume-ml"
        );


    const milkVolume =
        milkVolumeElement
            ? parseFloat(
                milkVolumeElement.value
            )
            : NaN;


    if (
        !Number.isFinite(
            milkVolume
        ) ||
        milkVolume <= 0
    ) {

        showMessage(
            "Enter a valid milk volume.",
            "error"
        );

        return;
    }


    const adulterantValidation =
        validateAdulterants();


    if (
        !adulterantValidation.valid
    ) {

        showMessage(
            adulterantValidation.message,
            "error"
        );

        return;
    }


    const adulterantData =
        getAdulterantData();


    const data = {

        milk_type:
            milkType,

        milk_volume_ml:
            milkVolume,

        adulterant:
            adulterantData.adulterant,

        water_present:
            adulterantData.water_present,

        urea_present:
            adulterantData.urea_present,

        starch_present:
            adulterantData.starch_present,

        detergent_present:
            adulterantData.detergent_present,

        water_amount:
            adulterantData.water_amount,

        water_unit:
            adulterantData.water_unit,

        urea_amount:
            adulterantData.urea_amount,

        urea_unit:
            adulterantData.urea_unit,

        starch_amount:
            adulterantData.starch_amount,

        starch_unit:
            adulterantData.starch_unit,

        detergent_amount:
            adulterantData.detergent_amount,

        detergent_unit:
            adulterantData.detergent_unit,

        ph:
            sampleData.ph,

        tds:
            sampleData.tds,

        tcs3448_f1:
            sampleData.tcs3448_f1,

        tcs3448_f2:
            sampleData.tcs3448_f2,

        tcs3448_fz:
            sampleData.tcs3448_fz,

        tcs3448_f3:
            sampleData.tcs3448_f3,

        tcs3448_f4:
            sampleData.tcs3448_f4,

        tcs3448_f5:
            sampleData.tcs3448_f5,

        tcs3448_fy:
            sampleData.tcs3448_fy,

        tcs3448_fxl:
            sampleData.tcs3448_fxl,

        tcs3448_f6:
            sampleData.tcs3448_f6,

        tcs3448_f7:
            sampleData.tcs3448_f7,

        tcs3448_f8:
            sampleData.tcs3448_f8,

        tcs3448_nir:
            sampleData.tcs3448_nir,

        tcs3448_clear:
            sampleData.tcs3448_clear,

        tcs3448_flicker:
            sampleData.tcs3448_flicker
    };


    console.log(
        "Saving sample:",
        data
    );


    socket.emit(
        "save_sample",
        data
    );
}


// ============================================================
// SAMPLE SAVED
// ============================================================

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

                const sampleId =
                    document.getElementById(
                        "sample-id"
                    );


                if (sampleId) {

                    sampleId.textContent =
                        data.next_sample_id;
                }

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


// ============================================================
// RESET SAMPLE
// ============================================================

function resetMeasurement() {

    sampleData = {

        ph: null,
        tds: null,

        tcs3448_f1: null,
        tcs3448_f2: null,
        tcs3448_fz: null,
        tcs3448_f3: null,
        tcs3448_f4: null,
        tcs3448_f5: null,
        tcs3448_fy: null,
        tcs3448_fxl: null,
        tcs3448_f6: null,
        tcs3448_f7: null,
        tcs3448_f8: null,
        tcs3448_nir: null,
        tcs3448_clear: null,
        tcs3448_flicker: null
    };


    const phValue =
        document.getElementById(
            "ph-value"
        );


    const tdsValue =
        document.getElementById(
            "tds-value"
        );


    const tcsValue =
        document.getElementById(
            "tcs-value"
        );


    if (phValue) {
        phValue.textContent =
            "--";
    }


    if (tdsValue) {
        tdsValue.textContent =
            "--";
    }


    if (tcsValue) {
        tcsValue.textContent =
            "--";
    }


    [
        "f1",
        "f2",
        "fz",
        "f3",
        "f4",
        "f5",
        "fy",
        "fxl",
        "f6",
        "f7",
        "f8",
        "nir",
        "clear",
        "flicker"
    ].forEach(
        channel => {

            const element =
                document.getElementById(
                    "tcs-" +
                    channel
                );


            if (element) {

                element.textContent =
                    "--";
            }
        }
    );


    const milkType =
        document.getElementById(
            "milk-type"
        );


    const milkVolume =
        document.getElementById(
            "milk-volume-ml"
        );


    if (milkType) {
        milkType.value =
            "";
    }


    if (milkVolume) {
        milkVolume.value =
            "100";
    }


    getAdulterantDefinitions()
        .forEach(
            item => {

                const checkbox =
                    document.getElementById(
                        item.checkbox
                    );

                const amount =
                    document.getElementById(
                        item.amount
                    );

                const unit =
                    document.getElementById(
                        item.unit
                    );

                const fields =
                    document.getElementById(
                        item.fields
                    );


                if (checkbox) {

                    checkbox.checked =
                        false;
                }


                if (amount) {

                    amount.value =
                        "";
                }


                if (unit) {

                    unit.value =
                        item.fixedUnit;
                }


                if (fields) {

                    fields.style.display =
                        "none";
                }
            }
        );


    const note =
        document.getElementById(
            "pure-milk-note"
        );


    if (note) {

        note.style.display =
            "";
    }


    const modal =
        document.getElementById(
            "measurement-modal"
        );


    const complete =
        document.getElementById(
            "measurement-complete"
        );


    const close =
        document.getElementById(
            "measurement-close"
        );


    const log =
        document.getElementById(
            "measurement-log"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

        delete modal.dataset.sensor;
    }


    if (complete) {

        complete.classList.remove(
            "active"
        );
    }


    if (close) {

        close.disabled =
            true;
    }


    if (log) {

        log.innerHTML =
            "";
    }


    const saveButton =
        document.getElementById(
            "save-sample"
        );


    if (saveButton) {

        saveButton.disabled =
            true;
    }


    measurementInProgress =
        false;


    setMeasurementButtons(
        false
    );


    checkCanSave();
}


// ============================================================
// MEASUREMENT BUTTONS
// ============================================================

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