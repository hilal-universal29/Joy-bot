const sharp = require("sharp");

function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function calculateBratFontSize(text) {
    const maxWidth = 440;
    const maxLines = 8;

    let fontSize = 72;

    while (fontSize >= 24) {
        const charWidth = fontSize * 0.55;
        const maxChars = Math.floor(maxWidth / charWidth);

        const lines = [];

        for (let i = 0; i < text.length; i += maxChars) {
            lines.push(text.slice(i, i + maxChars));
        }

        if (lines.length <= maxLines) {
            return {
                fontSize,
                lines,
                lineHeight: fontSize * 0.95
            };
        }

        fontSize -= 4;
    }

    const charWidth = 24 * 0.55;
    const maxChars = Math.floor(maxWidth / charWidth);

    const lines = [];

    for (let i = 0; i < text.length; i += maxChars) {
        lines.push(text.slice(i, i + maxChars));
    }

    return {
        fontSize: 24,
        lines,
        lineHeight: 24 * 0.95
    };
}

module.exports = async (Joy, msg, reply, args) => {
    const sender = msg.key.remoteJid;
    const q = args.join(" ").trim();

    if (!q) {
        return reply(
            "⚠️ *Contoh:* .brat halo dunia"
        );
    }

    try {
        const teks = escapeXml(
            q
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase()
        );

        const {
            fontSize,
            lines,
            lineHeight
        } = calculateBratFontSize(teks);

        const totalHeight =
            lines.length * lineHeight;

        const startY =
            (512 - totalHeight) / 2 +
            fontSize * 0.78;

        const tspans = lines
            .map((line, index) => {
                const y =
                    startY +
                    index * lineHeight;

                return `
                    <tspan
                        x="256"
                        y="${y}"
                    >${line}</tspan>
                `;
            })
            .join("");

        const svg = `
            <svg
                width="512"
                height="512"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter
                        id="bratBlur"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                    >
                        <feGaussianBlur
                            stdDeviation="1.15"
                        />
                    </filter>
                </defs>

                <rect
                    width="512"
                    height="512"
                    fill="#ffffff"
                />

                <text
                    x="256"
                    font-family="Arial Narrow, Arial, Helvetica, sans-serif"
                    font-size="${fontSize}px"
                    font-weight="400"
                    letter-spacing="-1.5px"
                    text-anchor="middle"
                    fill="#000000"
                    filter="url(#bratBlur)"
                >
                    ${tspans}
                </text>
            </svg>
        `;

        const stickerBuffer = await sharp(
            Buffer.from(svg)
        )
            .resize(512, 512, {
                fit: "fill"
            })
            .webp({
                quality: 95
            })
            .toBuffer();

        await Joy.sendMessage(
            sender,
            {
                sticker: stickerBuffer
            },
            {
                quoted: msg
            }
        );

    } catch (error) {
        console.error(
            "Error Brat Generator:",
            error
        );

        await reply(
            "⚠️ *Gagal membuat sticker BRAT.*"
        );
    }
};