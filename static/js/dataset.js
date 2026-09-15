async function loadDataset() {
    try {
        const response = await fetch("/api/samples");

        if (!response.ok) {
            throw new Error("Failed to load dataset.");
        }

        const samples = await response.json();

        const table = document.getElementById("dataset-table");
        const empty = document.getElementById("empty-dataset");

        table.innerHTML = "";

        document.getElementById("total-samples").textContent =
            samples.length;

        document.getElementById("pure-samples").textContent =
            samples.filter(
                sample => sample.adulterant === "Pure Milk"
            ).length;

        document.getElementById("adulterated-samples").textContent =
            samples.filter(
                sample => sample.adulterant !== "Pure Milk"
            ).length;

        if (samples.length === 0) {
            empty.style.display = "";
            return;
        }

        empty.style.display = "none";

        samples.forEach(sample => {
            const row = document.createElement("tr");

            const formatAmount = (amount, unit) => {
                if (
                    amount === null ||
                    amount === undefined
                ) {
                    return "--";
                }

                return `${amount} ${unit || ""}`.trim();
            };

            const waterAmount = formatAmount(
                sample.water_amount,
                sample.water_unit
            );

            const ureaAmount = formatAmount(
                sample.urea_amount,
                sample.urea_unit
            );

            const starchAmount = formatAmount(
                sample.starch_amount,
                sample.starch_unit
            );

            const detergentAmount = formatAmount(
                sample.detergent_amount,
                sample.detergent_unit
            );

            row.innerHTML = `
                <td>${sample.sample_id ?? "--"}</td>

                <td>${sample.milk_type ?? "--"}</td>

                <td>${sample.adulterant ?? "Pure Milk"}</td>

                <td>
                    ${sample.water_present === 1
                        ? "Yes"
                        : "No"}
                </td>

                <td>${waterAmount}</td>

                <td>
                    ${sample.urea_present === 1
                        ? "Yes"
                        : "No"}
                </td>

                <td>${ureaAmount}</td>

                <td>
                    ${sample.starch_present === 1
                        ? "Yes"
                        : "No"}
                </td>

                <td>${starchAmount}</td>

                <td>
                    ${sample.detergent_present === 1
                        ? "Yes"
                        : "No"}
                </td>

                <td>${detergentAmount}</td>

                <td>${sample.ph ?? "--"}</td>

                <td>${sample.tds ?? "--"}</td>

                <td>${sample.tcs3448_f1 ?? "--"}</td>
                <td>${sample.tcs3448_f2 ?? "--"}</td>
                <td>${sample.tcs3448_fz ?? "--"}</td>
                <td>${sample.tcs3448_f3 ?? "--"}</td>
                <td>${sample.tcs3448_f4 ?? "--"}</td>
                <td>${sample.tcs3448_f5 ?? "--"}</td>
                <td>${sample.tcs3448_fy ?? "--"}</td>
                <td>${sample.tcs3448_fxl ?? "--"}</td>
                <td>${sample.tcs3448_f6 ?? "--"}</td>
                <td>${sample.tcs3448_f7 ?? "--"}</td>
                <td>${sample.tcs3448_f8 ?? "--"}</td>
                <td>${sample.tcs3448_nir ?? "--"}</td>
                <td>${sample.tcs3448_clear ?? "--"}</td>
                <td>${sample.tcs3448_flicker ?? "--"}</td>

                <td>${sample.created_at ?? "--"}</td>

                <td>
                    <button
                        class="delete-button"
                        onclick="deleteSample('${sample.sample_id}')"
                    >
                        Delete
                    </button>
                </td>
            `;

            table.appendChild(row);
        });

    } catch (error) {
        console.error(
            "Dataset loading error:",
            error
        );
    }
}


async function deleteSample(sampleId) {
    const confirmed = confirm(
        `Delete sample ${sampleId}? This cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/api/samples/${encodeURIComponent(sampleId)}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error ||
                "Failed to delete sample."
            );
        }

        await loadDataset();

    } catch (error) {
        console.error(
            "Delete error:",
            error
        );

        alert(error.message);
    }
}


function exportDataset() {
    window.location.href = "/api/export";
}


document.addEventListener(
    "DOMContentLoaded",
    loadDataset
);