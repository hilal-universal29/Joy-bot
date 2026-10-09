const { getStats } = require("../../utils/tokenStats");

module.exports = async (Joy, msg, reply, args, command, context) => {
    const { isAuthor } = context;

    if (!isAuthor) {
        return reply("❌ *Perintah ini khusus Author.*");
    }

    const stats = getStats();

    const formatNumber = (number) =>
        Number(number).toLocaleString("id-ID");

    const formatUSD = (number) =>
        `$${Number(number).toFixed(6)}`;

    const statsText =
        `*TOKEN STATS*\n\n` +
        `*Model:* openai/gpt-oss-20b\n` +
        `*Request:* ${formatNumber(stats.requests)}\n\n` +
        `*Input Token:* ${formatNumber(stats.inputTokens)}\n` +
        `*Output Token:* ${formatNumber(stats.outputTokens)}\n` +
        `*Total Token:* ${formatNumber(stats.totalTokens)}\n\n` +
        `*Biaya Input:* ${formatUSD(stats.inputCost)}\n` +
        `*Biaya Output:* ${formatUSD(stats.outputCost)}\n` +
        `*Total Biaya:* ${formatUSD(stats.totalCost)}`;

    await reply(statsText);
};