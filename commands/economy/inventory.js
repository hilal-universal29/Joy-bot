const shopItems = require("../../config/shopItems");

const {
    getInventory
} = require("../../database/users");

module.exports = async (
    Joy,
    msg,
    reply
) => {
    const senderJid =
        msg.key.participant || msg.key.remoteJid;

    const result = getInventory(senderJid);

    if (!result.success) {
        if (result.reason === "unregistered") {
            return reply(
                "Kamu belum terdaftar. Ketik .reg."
            );
        }

        return reply("ID pengguna tidak valid.");
    }

    const items = Object.entries(result.inventory)
        .filter(([, quantity]) => Number(quantity) > 0);

    if (items.length === 0) {
        return reply(
            "*INVENTORI KAMU*\n\n" +
            "Inventori masih kosong.\n" +
            "Ketik .shop untuk membeli item."
        );
    }

    let text = "*INVENTORI KAMU*\n\n";

    for (const [itemId, quantity] of items) {
        const item = shopItems[itemId];
        const name = item?.name || itemId;

        text += `${name}: ${quantity} buah\n`;
    }

    return reply(text);
};