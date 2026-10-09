const {
    transferBalance,
    adjustBalance,
    formatRupiah,
    getBalance
} = require("../../database/users");

function parseAmount(value) {
    const text = String(value ?? "").trim().toLowerCase();
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*([kmb])?$/);

    if (!match) return NaN;

    const numberText = match[1];
    const suffix = match[2];

    if (!suffix && !/^\d+$/.test(numberText)) {
        return NaN;
    }

    const multipliers = {
        k: 1_000,
        m: 1_000_000,
        b: 1_000_000_000
    };

    const multiplier = multipliers[suffix] || 1;
    const amount = Number(numberText.replace(",", ".")) * multiplier;

    return Number.isSafeInteger(amount) ? amount : NaN;
}

module.exports = async (
    Joy,
    msg,
    reply,
    args,
    command,
    options = {}
) => {
    const context =
        msg.message?.extendedTextMessage?.contextInfo;

    const targetJid = context?.mentionedJid?.[0];

    const amountText = args[args.length - 1];
    const amount = parseAmount(amountText);

    if (
        ["tmsl", "krsl"].includes(command) &&
        !options.isAuthor
    ) {
        return;
    }

    if (command === "balance") {
        if (args.length > 0) {
            return reply(
                'Mungkin maksud Anda ".balance"?'
            );
        }

        const senderJid =
            msg.key.participant || msg.key.remoteJid;

        const result = getBalance(senderJid);

        if (!result.success) {
            if (result.reason === "unregistered") {
                return reply(
                    "Kamu belum terdaftar. Ketik .reg."
                );
            }

            return reply("ID pengguna tidak valid.");
        }

        return reply(
            `${formatRupiah(result.balance)}`
        );
    }
    if (!targetJid) {
        const usage = {
            tf: ".tf @user jumlah",
            tmsl: ".tmsl @user jumlah",
            krsl: ".krsl @user jumlah"
        };

        return reply(
            `Format penggunaan:\n${usage[command]}`
        );
    }

    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {
        if (["tmsl", "krsl"].includes(command)) {
            return;
        }

        return reply(
            "❌ Jumlah transfer tidak valid.\n" +
            "Contoh: .tf @user 100k"
        );
    }
    if (command === "tf") {
        const senderJid =
            msg.key.participant || msg.key.remoteJid;

        const result = transferBalance(
            senderJid,
            targetJid,
            amount
        );

        if (!result.success) {
            const errors = {
                invalid: "ID pengguna tidak valid.",
                self: "Kamu tidak bisa transfer ke akun sendiri.",
                amount: "Jumlah transfer tidak valid.",
                sender_unregistered:
                    "Kamu belum terdaftar. Ketik .reg.",
                recipient_unregistered:
                    "Penerima belum terdaftar.",
                insufficient:
                    "balance kamu tidak mencukupi."
            };

            return reply(
                "❌ " +
                (errors[result.reason] || "Transfer gagal.")
            );
        }

        return reply(
            "💸 *TRANSFER BERHASIL*\n\n" +
            `Penerima: ${result.recipientName}\n` +
            `Jumlah: ${formatRupiah(amount)}\n` +
            `Sisa balance: ${formatRupiah(result.senderBalance)}`
        );
    }

    if (command === "tmsl" || command === "krsl") {
        const isAdd = command === "tmsl";

        const result = adjustBalance(
            targetJid,
            isAdd ? amount : -amount
        );

        if (!result.success) {
            const errors = {
                unregistered:
                    "Pengguna tersebut belum terdaftar.",
                insufficient:
                    "balance pengguna tidak mencukupi untuk dikurangi.",
                invalid:
                    "ID pengguna tidak valid.",
                amount:
                    "Jumlah balance tidak valid."
            };

            return reply(
                "❌ " +
                (errors[result.reason] ||
                    "Gagal memperbarui balance.")
            );
        }

        return reply(
            `Success ${isAdd ? "+" : "-"}${formatRupiah(amount)}\n`
        );
    }

    return reply("Command transaksi tidak dikenal.");
};