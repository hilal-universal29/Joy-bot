const Groq = require("../../scrape/Groq");

async function askAI(prompt) {
    const response = await Groq(prompt);

    if (typeof response === "string") {
        return response.trim();
    }

    return (
        response?.choices?.[0]?.message?.content?.trim() || ""
    );
}

async function handleCommand(
    Joy,
    msg,
    reply,
    args,
    command,
    context = {}
) {
    const { errorMessage } = context;
    const question = args.join(" ").trim();

    if (!question) {
        return reply(
            '*Contoh:* .ai Kenapa Messi disebut GOAT?'
        );
    }

    try {
        const answer = await askAI(question);

        return await reply(
            answer ||
            "Maaf, aku belum menemukan jawaban yang pas."
        );
    } catch (error) {
        console.error(
            "Error AI:",
            error.response?.data || error.message
        );

        return await reply(
            errorMessage ||
            "Maaf, terjadi kesalahan saat memproses pertanyaanmu."
        );
    }
}

async function handleReply(
    Joy,
    msg,
    reply,
    body,
    quotedText = ""
) {
    const question = String(body || "").trim();

    if (!question) return;

    const prompt = quotedText
        ? `Konteks percakapan:
Pesan Joy yang dibalas:
${quotedText}

Pesan terbaru pengguna:
${question}

Jawab pesan terbaru sebagai kelanjutan percakapan sebelumnya.
Pahami konteksnya dan jangan memulai percakapan dari awal.
Hindari sapaan umum yang tidak relevan.`
        : question;

    try {
        const answer = await askAI(prompt);

        return await reply(
            answer ||
            "Maaf, aku belum menemukan jawaban yang pas."
        );
    } catch (error) {
        console.error(
            "Error reply AI:",
            error.response?.data || error.message
        );

        return await reply(
            "Maaf, terjadi kesalahan saat memproses pertanyaanmu."
        );
    }
}

module.exports = {
    handleCommand,
    handleReply
};