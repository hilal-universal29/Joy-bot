const tiktok2 = require("../../scrape/Tiktok");

module.exports = async (Joy, msg, reply, args) => {
    const sender = msg.key.remoteJid;
    const q = args.join(" ").trim();

    if (!q) {
        return reply("⚠ *Mana Link Tiktoknya?*");
    }

    await reply("*Sabarrrrr*");

    try {
        const result = await tiktok2(q);

        await Joy.sendMessage(
            sender,
            {
                video: {
                    url: result.no_watermark
                },
                caption: `*Joy Tiktok Downloader*`
            },
            { quoted: msg }
        );

    } catch (error) {
        console.error("Error TikTok DL:", error);

        await reply(
            "⚠ *Gagal Saat Melakukan Proses*"
        );
    }
};