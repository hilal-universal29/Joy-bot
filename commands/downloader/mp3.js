
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const API_BASE = 'https://ikhlasapi.web.id/api/downloader';
const MAX_SIZE = 40 * 1024 * 1024;

function getEndpoint(url) {
    const host = new URL(url).hostname.toLowerCase();

    if (/(^|\.)tiktok\.com$/.test(host)) {
        return 'tiktok-v2';
    }

    if (
        /(^|\.)youtube\.com$/.test(host) ||
        host === 'youtu.be'
    ) {
        return 'youtube';
    }

    if (
        /(^|\.)instagram\.com$/.test(host) ||
        host === 'instagr.am'
    ) {
        return 'sssinstagram';
    }

    if (/(^|\.)soundcloud\.com$/.test(host)) {
        return 'soundcloud';
    }

    return 'savefrom';
}

function findMediaUrl(data, mode) {
    const candidates = [];

    function scan(value, keys = [], hints = '') {
        if (typeof value === 'string') {
            if (!/^https?:\/\//i.test(value)) return;

            const keyPath = keys.join('.').toLowerCase();
            const context = `${keyPath} ${hints}`.toLowerCase();

            const isAudio =
                /(audio|music|mp3|m4a|aac|sound|song)/i.test(context);

            const isImage =
                /(image|photo|slides?|pattern|cover|thumbnail|avatar|profile|poster)/i.test(context);

            const isVideo =
                /(video|mp4|play_addr|download)/i.test(context);

            let score = 0;

            if (mode === 'audio') {
                if (isImage || (isVideo && !isAudio)) return;

                if (isAudio) score += 10;

                if (/\.mp3(?:[?#]|$)/i.test(value)) score += 15;
                if (/\.m4a(?:[?#]|$)/i.test(value)) score += 8;
            } else {
                if (isImage || isAudio) return;

                if (isVideo) score += 10;
                if (/\.mp4(?:[?#]|$)/i.test(value)) score += 8;
            }

            if (score > 0) {
                candidates.push({ url: value, score });
            }

            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) =>
                scan(item, [...keys, String(index)], hints)
            );
            return;
        }

        if (value && typeof value === 'object') {
            const metadata = [
                value.type,
                value.mimeType,
                value.mime_type,
                value.ext,
                value.extension,
                value.format
            ].filter(Boolean).join(' ');

            for (const [key, item] of Object.entries(value)) {
                scan(item, [...keys, key], `${hints} ${metadata}`);
            }
        }
    }

    scan(data);

    candidates.sort((a, b) => b.score - a.score);

    return candidates[0]?.url || null;
}

async function convertToMp3(buffer) {
    const id = crypto.randomUUID();
    const inputPath = path.join(os.tmpdir(), `joy-${id}.bin`);
    const outputPath = path.join(os.tmpdir(), `joy-${id}.mp3`);

    try {
        await fs.writeFile(inputPath, buffer);

        await new Promise((resolve, reject) => {
            execFile(
                'ffmpeg',
                [
                    '-y',
                    '-i', inputPath,
                    '-map', '0:a:0',
                    '-vn',
                    '-codec:a', 'libmp3lame',
                    '-b:a', '192k',
                    outputPath
                ],
                {
                    timeout: 120000,
                    maxBuffer: 2 * 1024 * 1024
                },
                error => error ? reject(error) : resolve()
            );
        });

        const mp3 = await fs.readFile(outputPath);

        if (!mp3.length || mp3.length > MAX_SIZE) {
            throw new Error('Ukuran hasil MP3 tidak sesuai batas.');
        }

        return mp3;
    } finally {
        await Promise.all([
            fs.unlink(inputPath).catch(() => {}),
            fs.unlink(outputPath).catch(() => {})
        ]);
    }
}

module.exports = {
    name: 'mp3',
    category: 'downloader',
    description: 'Download audio from supported media links',

    async execute(sock, msg, args) {
        const chat = msg.key.remoteJid;
        const input = args.join(' ').trim();
        const url = input.match(/https?:\/\/\S+/i)?.[0]
            ?.replace(/[),.!?]+$/, '');

        if (!url) {
            return sock.sendMessage(chat, {
                text: 'Masukkan link video atau media!\n\nContoh: .mp3 https://youtu.be/VIDEO_ID'
            }, { quoted: msg });
        }

        try {
            new URL(url);
        } catch {
            return sock.sendMessage(chat, {
                text: 'URL tidak valid.'
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, {
                text: 'Sedang mengambil audio dan menyiapkan MP3...'
            }, { quoted: msg });

            const endpoint = getEndpoint(url);

            console.log(`[MP3] Endpoint: ${endpoint}`);

            const response = await axios.get(
                `${API_BASE}/${endpoint}`,
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
                    data.message ||
                    data.error ||
                    'API gagal memproses media.'
                );
            }

            let mediaUrl = findMediaUrl(data, 'audio');
            let isAudio = Boolean(mediaUrl);

            if (!mediaUrl) {
                mediaUrl = findMediaUrl(data, 'video');
            }

            if (!mediaUrl) {
                console.error(
                    'URL media tidak ditemukan:',
                    JSON.stringify(data, null, 2)
                );

                throw new Error(
                    'URL audio/video tidak ditemukan dalam respons API.'
                );
            }

            const mediaResponse = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: MAX_SIZE,
                maxBodyLength: MAX_SIZE
            });

            const contentType = String(
                mediaResponse.headers['content-type'] || ''
            );

            if (
                /text\/html|application\/json/i.test(contentType)
            ) {
                throw new Error(
                    'URL media tidak mengembalikan file audio/video.'
                );
            }

            const buffer = Buffer.from(mediaResponse.data);

            if (!buffer.length || buffer.length > MAX_SIZE) {
                throw new Error('Ukuran media kosong atau terlalu besar.');
            }

            const isMp3 =
                isAudio &&
                (
                    /audio\/mpeg/i.test(contentType) ||
                    /\.mp3(?:[?#]|$)/i.test(mediaUrl)
                );

            const mp3Buffer = isMp3
                ? buffer
                : await convertToMp3(buffer);

            await sock.sendMessage(chat, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                fileName: 'joy-audio.mp3',
                ptt: false
            }, { quoted: msg });

            console.log('[MP3] Audio berhasil dikirim.');

        } catch (error) {
            console.error('[MP3 ERROR]', {
                message: error.message,
                code: error.code,
                status: error.response?.status
            });

            let message = 'Gagal memproses audio. Coba lagi nanti.';

            if (error.code === 'ENOENT' &&
                /ffmpeg/i.test(error.message)) {
                message = 'FFmpeg belum terpasang di server';
            } else if (error.response?.status === 503) {
                message = '⚠️ Layanan downloader sedang tidak tersedia. Coba lagi nanti.';
            }

            await sock.sendMessage(chat, {
                text: message
            }, { quoted: msg });
        }
    }
};
