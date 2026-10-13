
const axios = require('axios');
const sharp = require('sharp');
const API_URL = 'https://ikhlasapi.web.id/api/maker/brat';

module.exports = async (Joy, msg, reply, args) => {
    const chat = msg.key.remoteJid;
    const animated = /^a$/i.test(args[0] || '');
    const text = (animated ? args.slice(1) : args).join(' ').trim();

    if (!text) {
        return reply(
            'Masukkan teks yang ingin dibuat!\n\n' +
            'Contoh:\n' +
            '.brat hello world\n' +
            '.brat a hello world'
        );
    }

    if (text.length > 800) {
        return reply('Teks maksimal 800 karakter.');
    }

    try {
        await axios.get(API_URL, {
            params: {
                text,
                isAnimated: animated,
                delay: 500
            },
            responseType: 'arraybuffer',
            headers: {
                Accept: 'image/png, image/jpeg, image/gif'
            },
            timeout: 60000,
            maxContentLength: 15 * 1024 * 1024
        }).then(async response => {
            const buffer = Buffer.from(response.data);
            const mime = response.headers['content-type'] || '';

            if (!mime.startsWith('image/')) {
                throw new Error(
                    `Respons API bukan gambar: ${mime}`
                );
            }

            const stickerBuffer = await sharp(
                buffer,
                animated ? { animated: true } : {}
            )
                .resize(512, 512, {
                    fit: 'contain',
                    background: {
                        r: 0,
                        g: 0,
                        b: 0,
                        alpha: 0
                    }
                })
                .webp({
                    effort: 5,
                    ...(animated ? { loop: 0 } : {})
                })
                .toBuffer();

            await Joy.sendMessage(chat, {
                sticker: stickerBuffer
            }, { quoted: msg });
        });

    } catch (error) {
        console.error('[BRAT ERROR]', {
            message: error.message,
            status: error.response?.status,
            code: error.code
        });

        await reply(
            'Gagal membuat Brat. Coba lagi nanti.'
        );
    }
};
