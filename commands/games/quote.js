const quotes = [
    "Jangan menyerah, hari buruk akan berlalu.",
    "Kesempatan tidak datang dua kali.",
    "Hidup ini singkat, jangan sia-siakan.",
    "TIDAK PERLU KATA KATA,YANG PENTING BUKTI NYATA",
    "bct",
    "Kamu lebih kuat dari yang kamu kira.",
];

module.exports = async (Joy, msg, reply) => {
    const randomQuote =
        quotes[Math.floor(Math.random() * quotes.length)];

    await reply(`*Quote Hari Ini :*\n_"${randomQuote}"_`);
};