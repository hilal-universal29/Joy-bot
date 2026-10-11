const quotes = [
    "mangatt",
    "mangat",
    "jangan menyerah",
    "Jangan menyerahh",
    "",
];

module.exports = async (Joy, msg, reply) => {
    const randomQuote =
        quotes[Math.floor(Math.random() * quotes.length)];

    await reply(`_"${randomQuote}"_`);
};