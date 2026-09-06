async function loadDataset() {

    const response =
        await fetch(
            "/api/samples"
        );


    const samples =
        await response.json();


    const table =
        document.getElementById(
            "dataset-table"
        );


    table.innerHTML = "";


    samples.forEach(
        function(sample) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${sample.sample_id}
                </td>

                <td>
                    ${sample.milk_type}
                </td>

                <td>
                    ${sample.adulterant}
                </td>

                <td>
                    ${sample.concentration}
                </td>

                <td>
                    ${sample.ph ?? "--"}
                </td>

                <td>
                    ${sample.tds ?? "--"}
                </td>

                <td>
                    ${sample.tcs3448_clear ?? "--"}
                </td>

                <td>
                    ${sample.tcs3448_red ?? "--"}
                </td>

                <td>
                    ${sample.tcs3448_green ?? "--"}
                </td>

                <td>
                    ${sample.tcs3448_blue ?? "--"}
                </td>

                <td>
                    ${sample.created_at}
                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


function exportDataset() {

    window.location.href =
        "/api/export";

}


loadDataset();