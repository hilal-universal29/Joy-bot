const shopItems = require("../../config/shopItems");

const {
    purchaseItem,
    formatRupiah
} = require("../../database/users");

module.exports = async (
    Joy,
    msg,
    reply,
    args,
    command = "shop"
) => {
    const senderJid =
        msg.key.participant || msg.key.remoteJid;

    const cmd = String(command || "").toLowerCase();
    let itemId;
    let quantityText;

    if (cmd === "buy") {
        if (!args[0]) {
            return reply(
                "Penggunaan shortcut .buy:\n" +
                ".buy [nama item] [jumlah]\n" +
                "Contoh: .buy clue 2\n\n" +
                "Ketik *.shop* untuk melihat daftar item."
            );
        }

        itemId = args[0].toLowerCase();
        quantityText = args[1] || "1";
    } else {
        const action = (args[0] || "").toLowerCase();

        if (!action || action === "list") {
            const items = Object.values(shopItems);

            let text = "*SHOP*\n\n";

            for (const item of items) {
                text +=
                    `*${item.name}*\n` +
                    `Harga: ${formatRupiah(item.price)}\n` +
                    `${item.description}\n\n`;
            }

            text +=
                "Cara membeli:\n" +
                "• .buy (nama item) (qty)\n" +
                "• .shop buy (nama item) (qty)\n" +
                "Contoh: .buy clue 2\n\n" +
                "Lihat barang milikmu: .inventory";

            return reply(text);
        }

        if (action === "buy") {
            itemId = (args[1] || "").toLowerCase();
            quantityText = args[2] || "1";
        } else if (shopItems[action]) {
            itemId = action;
            quantityText = args[1] || "1";
        } else {
            return reply(
                "Penggunaan:\n" +
                "• .shop\n" +
                "• .buy clue [jumlah]\n" +
                "Contoh: .buy clue 2"
            );
        }
    }

    const item = shopItems[itemId];

    if (!item) {
        return reply(
            "Item tidak ditemukan. Ketik *.shop* untuk melihat katalog."
        );
    }

    if (!/^\d+$/.test(quantityText)) {
        return reply(
            "Jumlah pembelian harus berupa angka bulat."
        );
    }

    const quantity = Number(quantityText);

    if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 500
    ) {
        return reply(
            "Jumlah pembelian minimal 1 dan maksimal 500 item."
        );
    }

    const result = purchaseItem(
        senderJid,
        item.id,
        quantity,
        item.price
    );

    if (!result.success) {
        const errors = {
            invalid: "ID pengguna tidak valid.",
            unregistered:
                "Kamu belum terdaftar. Ketik .reg.",
            insufficient:
                "Saldo kamu tidak mencukupi.",
            amount:
                "Jumlah pembelian tidak valid."
        };

        return reply(
            errors[result.reason] ||
            "Pembelian gagal."
        );
    }

    return reply(
        "*PEMBELIAN BERHASIL*\n\n" +
        `Item: ${item.name}\n` +
        `Jumlah: ${quantity}\n` +
        `Total: ${formatRupiah(result.total)}\n` +
        `Sisa saldo: ${formatRupiah(result.balance)}\n` +
        `Item dalam inventori: ${result.inventoryCount}`
    );
};