
const axios = require('axios');

function findVideoUrl(data) {
    const candidates = [];

    function scan(value, path = []) {
        if (typeof value === 'string') {
            if (!/^https?:\/\//i.test(value)) return;

            const key = path.join('.').toLowerCase();

            if (/audio|music|cover|avatar|image|photo|thumbnail/.test(key)) {
                return;
            }

            let score = 0;

            if (/nowm|no.?watermark|hdplay/.test(key)) score += 10;
            if (/video/.test(key)) score += 8;
            if (/play/.test(key)) score += 5;
            if (/download/.test(key)) score += 3;
            if (/\.mp4(?:[?#]|$)/i.test(value)) score += 4;

            if (score > 0) {
                candidates.push({ url: value, score });
            }

            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                scan(item, [...path, String(index)]);
            });
            return;
        }

        if (value && typeof value === 'object') {
            const isVideo = /video/i.test(
                String(value.type || value.mimeType || value.mime_type || '')
            );

            for (const [key, item] of Object.entries(value)) {
                const nextPath = isVideo
                    ? [...path, 'video', key]
                    : [...path, key];

                scan(item, nextPath);
            }
        }
    }

    scan(data);

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.url || null;
}


function findPhotoUrls(data) {
    const urls = [];

    function scan(value, path = []) {
        if (typeof value === 'string') {
            if (!/^https?:\/\//i.test(value)) return;

            const keyPath = path.join('.').toLowerCase();

            if (
                /(^|\.)(cover|avatar|thumbnail|profile|music|audio|video|play|author|icon|pattern)(\.|$)/i.test(keyPath)
            ) {
                return;
            }

            if (
                /(images?|photos?|pictures?|pics?|slides?|carousel|imageurls?|photourls?)/i.test(keyPath)
            ) {
                urls.push(value);
            }

            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) =>
                scan(item, [...path, String(index)])
            );
            return;
        }

        if (value && typeof value === 'object') {
            for (const [key, item] of Object.entries(value)) {
                scan(item, [...path, key]);
            }
        }
    }

    scan(data);
    return [...new Set(urls)];
}


module.exports = {
    name: 'tiktok',
    aliases: ['tiktok'],
    category: 'downloader',
    description: 'Download video TikTok',

    async execute(sock, msg, args) {
        const chat = msg.key.remoteJid;
        const input = args.join(' ').trim();
        const url = input.match(/https?:\/\/\S+/i)?.[0]
            ?.replace(/[),.!?]+$/, '');

        if (!url) {
            return sock.sendMessage(chat, {
                text: 'Masukkan URL video TikTok!\n\nContoh: .ttdl https://vt.tiktok.com/...'
            }, { quoted: msg });
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(url);
        } catch {
            return sock.sendMessage(chat, {
                text: 'URL tidak valid.'
            }, { quoted: msg });
        }

        if (!/(^|\.)tiktok\.com$/i.test(parsedUrl.hostname)) {
            return sock.sendMessage(chat, {
                text: 'URL harus berasal dari TikTok.'
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, {
                text: 'wait'
            }, { quoted: msg });

            const response = await axios.get(
                'https://ikhlasapi.web.id/api/downloader/tiktok-v2',
                {
                    params: { url },
                    headers: { Accept: 'application/json' },
                    timeout: 60000
                }
            );

            
            const data = response.data;

            if (
                data?.status === false ||
                data?.success === false
            ) {
                throw new Error(
                    data.message || data.error || 'API menolak permintaan'
                );
            }

            // Periksa apakah postingan berisi galeri foto
            const photoUrls = findPhotoUrls(data);
photoUrls.forEach((photoUrl, index) => {
    console.log(
        `TTDL PHOTO ${index + 1}/${photoUrls.length}:`,
        photoUrl.slice(0, 120),
        '| Panjang URL:',
        photoUrl.length
    );
});
            
            if (photoUrls.length > 0) {
                console.log(`TTDL: ${photoUrls.length} foto ditemukan`);

                for (let i = 0; i < photoUrls.length; i++) {
                    const imageResponse = await axios.get(photoUrls[i], {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 20 * 1024 * 1024
                    });

                    await sock.sendMessage(chat, {
                        image: Buffer.from(imageResponse.data),
                        caption: `TikTok Photo ${i + 1}/${photoUrls.length}`
                    }, { quoted: msg });
                }

                return;
            }

            // Jika bukan galeri foto, proses sebagai video
            const videoUrl = findVideoUrl(data);

            if (!videoUrl) {
                console.error(
                    'URL video tidak ditemukan:',
                    JSON.stringify(data, null, 2)
                );

                return sock.sendMessage(chat, {
                    text: 'Link video tidak ditemukan dalam respons API.'
                }, { quoted: msg });
            }

            const media = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 80 * 1024 * 1024
            });

            const contentType =
                media.headers['content-type'] || '';

            if (contentType.includes('application/json')) {
                throw new Error('URL video mengembalikan respons JSON.');
            }

            await sock.sendMessage(chat, {
                video: Buffer.from(media.data),
                mimetype: 'video/mp4',
                caption: 'Iya Sama sama'
            }, { quoted: msg });



} catch (error) {
    console.error('========== TTDL ERROR ==========');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('HTTP Status:', error.response?.status);
    console.error(
        'API Response:',
        JSON.stringify(error.response?.data ?? null)
    );
    console.error('Stack:', error.stack);
    console.error('================================');

    await sock.sendMessage(chat, {
        text: '❌ Gagal mengunduh video TikTok.'
    }, { quoted: msg });
}


    }
};
