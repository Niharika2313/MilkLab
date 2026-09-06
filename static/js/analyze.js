let analysisData = {

    ph: null,

    tds: null,

    tcs3448: null

};


let analysisRunning = false;


/* =========================================
   INITIAL STATUS
========================================= */

function updateAnalysisReadiness() {

    const esp32Ready =
        typeof esp32Online !== "undefined"
        && esp32Online;


    const ph =
        document.getElementById(
            "analysis-ph-status"
        );

    const tds =
        document.getElementById(
            "analysis-tds-status"
        );

    const tcs =
        document.getElementById(
            "analysis-tcs-status"
        );

    const esp =
        document.getElementById(
            "analysis-esp32"
        );


    if (!esp) {
        return;
    }


    esp.textContent =
        esp32Ready
            ? "● Online"
            : "● Offline";


    esp.style.color =
        esp32Ready
            ? "var(--green)"
            : "var(--red)";


    if (
        window.sensorStates
    ) {

        ph.textContent =
            window.sensorStates.ph
                ? "● Ready"
                : "● Offline";

        tds.textContent =
            window.sensorStates.tds
                ? "● Ready"
                : "● Offline";

        tcs.textContent =
            window.sensorStates.tcs3448
                ? "● Ready"
                : "● Offline";

    }


    const ready =

        esp32Ready &&

        window.sensorStates &&

        window.sensorStates.ph &&

        window.sensorStates.tds &&

        window.sensorStates.tcs3448;


    const button =
        document.getElementById(
            "start-analysis"
        );


    if (button) {

        button.disabled =
            !ready;

    }


    const message =
        document.getElementById(
            "analysis-start-message"
        );


    if (message) {

        message.textContent =
            ready
                ? "All systems ready."
                : "Waiting for all sensors...";

    }

}


/* =========================================
   START
========================================= */

function startAnalysis() {

    if (analysisRunning) {
        return;
    }


    if (
        !esp32Online
    ) {

        alert(
            "ESP32-S3 is offline."
        );

        return;

    }


    analysisRunning = true;


    analysisData = {

        ph: null,

        tds: null,

        tcs3448: null

    };


    document.getElementById(
        "analysis-start"
    ).style.display =
        "none";


    document.getElementById(
        "analysis-results"
    ).style.display =
        "none";


    document.getElementById(
        "analysis-running"
    ).style.display =
        "block";


    setStep(
        "step-ph",
        "Measuring..."
    );


    document.getElementById(
        "analysis-progress-text"
    ).textContent =
        "Taking pH measurement...";


    socket.emit(
        "sensor_command",
        {
            sensor: "ph"
        }
    );

}


/* =========================================
   SENSOR RESULT
========================================= */

socket.on(
    "sensor_result",
    function(data) {

        if (!analysisRunning) {
            return;
        }


        if (
            data.sensor === "ph"
        ) {

            analysisData.ph =
                data.value;


            setStep(
                "step-ph",
                "Complete",
                true
            );


            document.getElementById(
                "analysis-progress-text"
            ).textContent =
                "Taking TDS measurement...";


            setStep(
                "step-tds",
                "Measuring..."
            );


            socket.emit(
                "sensor_command",
                {
                    sensor: "tds"
                }
            );

        }


        else if (
            data.sensor === "tds"
        ) {

            analysisData.tds =
                data.value;


            setStep(
                "step-tds",
                "Complete",
                true
            );


            document.getElementById(
                "analysis-progress-text"
            ).textContent =
                "Taking optical measurement...";


            setStep(
                "step-tcs",
                "Measuring..."
            );


            socket.emit(
                "sensor_command",
                {
                    sensor: "tcs3448"
                }
            );

        }

    }
);


/* =========================================
   TCS3448 RESULT
========================================= */

socket.on(
    "tcs3448_result",
    function(data) {

        if (!analysisRunning) {
            return;
        }


        analysisData.tcs3448 =
            data;


        setStep(
            "step-tcs",
            "Complete",
            true
        );


        document.getElementById(
            "analysis-progress-text"
        ).textContent =
            "Preparing analysis...";


        setTimeout(
            showResults,
            700
        );

    }
);


/* =========================================
   STEP
========================================= */

function setStep(
    id,
    text,
    complete = false
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        complete
            ? "✓ " + text
            : text;


    if (complete) {

        element.classList.add(
            "complete"
        );

    }

}


/* =========================================
   SHOW RESULTS
========================================= */

function showResults() {

    analysisRunning = false;


    document.getElementById(
        "analysis-running"
    ).style.display =
        "none";


    document.getElementById(
        "analysis-results"
    ).style.display =
        "block";


    document.getElementById(
        "result-ph"
    ).textContent =
        analysisData.ph ?? "--";


    document.getElementById(
        "result-tds"
    ).textContent =
        analysisData.tds ?? "--";


    document.getElementById(
        "result-tcs"
    ).textContent =
        analysisData.tcs3448
            ? "Received"
            : "--";


    /*
       TEMPORARY UI DEMO

       These values are NOT the final ML prediction.

       Later this section will receive
       the actual prediction from Flask.
    */

    const demoPrediction = {

        pure: 82,

        water: 8,

        urea: 3,

        starch: 5,

        detergent: 2

    };


    const score = 87;


    setScore(
        score
    );


    setPrediction(
        "pure",
        demoPrediction.pure
    );


    setPrediction(
        "water",
        demoPrediction.water
    );


    setPrediction(
        "urea",
        demoPrediction.urea
    );


    setPrediction(
        "starch",
        demoPrediction.starch
    );


    setPrediction(
        "detergent",
        demoPrediction.detergent
    );


    document.getElementById(
        "result-title"
    ).textContent =
        "Low indication of adulteration";


    document.getElementById(
        "result-description"
    ).textContent =
        "The measured sensor profile is relatively consistent with the reference milk profile. Final adulterant classification will be provided by the validated ML model once it is connected.";


    document.getElementById(
        "result-confidence"
    ).textContent =
        "Analysis based on pH + TDS + TCS3448 measurements.";


    document.getElementById(
        "overall-interpretation"
    ).textContent =
        "The sample has been successfully measured using all three sensors. The values shown above represent the sensor observations. The final adulterant prediction and quality score will be generated from the experimentally validated model.";

}


/* =========================================
   SCORE
========================================= */

function setScore(score) {

    const number =
        document.getElementById(
            "score-number"
        );


    const ring =
        document.getElementById(
            "score-ring"
        );


    number.textContent =
        score;


    ring.style.setProperty(
        "--score",
        score + "%"
    );

}


/* =========================================
   PREDICTION
========================================= */

function setPrediction(
    name,
    value
) {

    const bar =
        document.getElementById(
            "pred-" + name
        );


    const text =
        document.getElementById(
            "pred-" + name + "-value"
        );


    if (!bar || !text) {
        return;
    }


    bar.style.width =
        value + "%";


    text.textContent =
        value + "%";

}


/* =========================================
   NEW ANALYSIS
========================================= */

function newAnalysis() {

    analysisData = {

        ph: null,

        tds: null,

        tcs3448: null

    };


    document.getElementById(
        "analysis-results"
    ).style.display =
        "none";


    document.getElementById(
        "analysis-running"
    ).style.display =
        "none";


    document.getElementById(
        "analysis-start"
    ).style.display =
        "block";


    updateAnalysisReadiness();

}