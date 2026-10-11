
const {
    adjustBalance,
    formatRupiah
} = require("../../database/users");

function parseAmount(value) {
    const text = String(value ?? "")
        .trim()
        .toLowerCase();

    const match = text.match(
        /^(\d+(?:[.,]\d+)?)\s*([kmb])?$/
    );

    if (!match) return NaN;

    const numberText = match[1];
    const suffix = match[2];

    if (!suffix && !/^\d+$/.test(numberText)) {
        return NaN;
    }

    const multipliers = {
        k: 1000,
        m: 1000000,
        b: 1000000000
    };

    const amount =
        Number(numberText.replace(",", ".")) *
        (multipliers[suffix] || 1);

    return Number.isSafeInteger(amount)
        ? amount
        : NaN;
}

module.exports = async (
    Joy,
    msg,
    reply,
    args,
    command,
    options = {}
) => {
    if (!options.isAuthor) return;

    const amount = parseAmount(args[0]);

    if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
    ) {
        return;
    }

    const senderJid =
        options.senderJid ||
        msg.key.participantAlt ||
        msg.key.participant ||
        msg.key.remoteJidAlt ||
        msg.key.remoteJid;

    const result = adjustBalance(
        senderJid,
        amount
    );

    if (!result.success) {
        return;
    }

    return reply(
        `Success ${formatRupiah(amount)}`
    );
};
