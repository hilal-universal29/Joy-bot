const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, 'tokenStats.json');

// Harga Groq untuk openai/gpt-oss-20b
// USD per 1 juta token
const INPUT_PRICE = 0.075;
const OUTPUT_PRICE = 0.30;

const defaultStats = {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0
};

function loadStats() {
    try {
        if (!fs.existsSync(statsFile)) {
            fs.writeFileSync(
                statsFile,
                JSON.stringify(defaultStats, null, 2)
            );

            return { ...defaultStats };
        }

        const data = fs.readFileSync(statsFile, 'utf8');

        return {
            ...defaultStats,
            ...JSON.parse(data)
        };

    } catch (error) {
        console.error(
            'Gagal membaca tokenStats.json:',
            error.message
        );

        return { ...defaultStats };
    }
}

function saveStats(stats) {
    try {
        fs.writeFileSync(
            statsFile,
            JSON.stringify(stats, null, 2)
        );
    } catch (error) {
        console.error(
            'Gagal menyimpan tokenStats.json:',
            error.message
        );
    }
}

let stats = loadStats();

function addUsage(usage) {
    if (!usage) return;

    const inputTokens =
        usage.prompt_tokens ||
        usage.input_tokens ||
        0;

    const outputTokens =
        usage.completion_tokens ||
        usage.output_tokens ||
        0;

    const totalTokens =
        usage.total_tokens ||
        (inputTokens + outputTokens);

    const inputCost =
        (inputTokens / 1_000_000) * INPUT_PRICE;

    const outputCost =
        (outputTokens / 1_000_000) * OUTPUT_PRICE;

    stats.requests += 1;

    stats.inputTokens += inputTokens;
    stats.outputTokens += outputTokens;
    stats.totalTokens += totalTokens;

    stats.inputCost += inputCost;
    stats.outputCost += outputCost;
    stats.totalCost += inputCost + outputCost;

    saveStats(stats);
}

function getStats() {
    return { ...stats };
}

function resetStats() {
    stats = { ...defaultStats };

    saveStats(stats);
}

module.exports = {
    addUsage,
    getStats,
    resetStats
};