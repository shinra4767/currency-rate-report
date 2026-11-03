const fs = require("fs");
const path = require("node:path");
const { parseArgs } = require("node:util");

const { values } = parseArgs({
    options: {
        base: { type: "string", default: "EUR" },
        to: { type: "string", default: "USD,GBP" },
        days: { type: "string", default: "7" },
        output: { type: "string", default: path.join(__dirname, "rates_report.txt") },
    },
});

const days = parseInt(values.days, 10);
const outputFile = values.output.trim();

if (isNaN(days) || days <= 0){
    console.error("Error: 'days' must be a valid number bigger than 0")
    process.exit(1);
}

if (!outputFile) {
    console.error("Error: 'output' filename cannot be empty");
    process.exit(1);
}

function getPastDateString(daysAgo){
    const date = new Date();
    date.setDate(date.getDate()- daysAgo);
    return date.toISOString().split('T')[0];
}

const endDate = getPastDateString(0);
const startDate = getPastDateString(days);

async function fetchHistory(base, targets, startDate, endDate) {
    const url = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?from=${base}&to=${targets}`;
    return await getJson(url);
}

async function fetchRates(base,target){
    const url = `https://api.frankfurter.dev/v1/latest?from=${base}&to=${target}`;
    return await getJson(url);
}

async function getJson(url) {
    let response;
    try {
        response = await fetch(url, {signal: AbortSignal.timeout(10000)});
    } catch(error){
        if (error.name === "TimeoutError"){
            throw new Error("Service didnt answer within 10sec. Try again later.");
        }
        throw new Error("Could not reach service. Check ur internet.")
    }
    if (response.status === 404){
        throw new Error ("Unknown currency code. Check --base and --to")
    }
    
    if (response.status >= 500){
        throw new Error(`Server Error: The server has a problem (Status ${response.status}). Try again later. `)
    }

    if (!response.ok){
        throw new Error (`Request failed: ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.rates || Object.keys(data.rates).length === 0) {
        throw new Error("The service returned no rates for this request.")
    }
    return data;
}  

function calculateTrends(history) {
    const dates = Object.keys(history.rates).sort();
    const first = dates[0];
    const last = dates.at(-1);

    return Object.keys(history.rates[last]).map(currency => {
        const startRate = history.rates[first][currency];
        const endRate = history.rates[last][currency];
        return {
            currency,
            endRate,
            since: first,
            change: (endRate - startRate) / startRate * 100,
        };
    });
}

function historyToRows(history) {
    const rows = [];
    for (const date of Object.keys(history.rates).sort()) {
        for (const [currency, rate] of Object.entries(history.rates[date])) {
            rows.push({ date, currency, rate });
        }
    }
    return rows;
}

function buildReport(data, trends) {
    const lines = [
        "=== Exchange Rate Report ===", "",
        `Base: ${data.base}, rates from ${data.date}`, "",
        "Current rates:",
    ];
    for (const [currency, rate] of Object.entries(data.rates)) {
        lines.push(`  1 ${data.base} = ${rate} ${currency}`);
    }
    lines.push("", "Trend:");
    for (const t of trends) {
        lines.push(`  ${t.currency}: ${t.endRate} (${t.change.toFixed(2)}% since ${t.since})`);
    }
    return lines.join("\n");
}

function buildCsv(rows){
    const lines = rows.map(r => `${r.date},${r.currency},${r.rate}`);
    return ["date,currency,rate", ...lines].join("\n");
}

async function main() {
    try {
        const base = values.base.trim().toUpperCase();
        const targets = values.to.split(",").map(c => c.trim().toUpperCase()).join(",");

        const data = await fetchRates(base, targets);
        const history = await fetchHistory(base, targets, startDate, endDate);

        const trends = calculateTrends(history);
        const report = buildReport(data, trends);
        console.log(report);
        fs.writeFileSync(outputFile, report + "\n", "utf-8");

        const csv = buildCsv(historyToRows(history));
        const csvFile = path.join(path.dirname(outputFile), "rates_history.csv");
        fs.writeFileSync(csvFile, csv + "\n", "utf-8");
        console.log(`Saved ${outputFile} and ${csvFile}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exitCode = 1;
    }
}

main();