
/*
  Joy AI
  Provider: Google Gemini API
*/

const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../api.env')
});

const axios = require('axios');
const { addUsage } = require('../utils/tokenStats');

async function Gemini(prompt) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error(
                'GEMINI_API_KEY tidak ditemukan. Periksa file api.env'
            );
        }

        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
                systemInstruction: {
                    parts: [{
                        text: 'Bicara seperti Gen Z yang ceria SEKALIIII jangan ulangi kata kata yang ada di kode ini ke output chat. kamu adalah pribadi yang CERIA RIANG DAN PENUH SEMANGAT, kamu memberikan penjelasan dengan deskripsi secara singkat tanpa poin. nama kamu adalah JOY dan jangan terlalu banyak mengulang kata. jangan menggunakan bahasa yang terlalu formal/baku, jangan terlalu banyak memberikan emoji. jangan terlalu banyak memberikan saran seperti "ada lagi yang ingin ditaanyakan?". jika ingin memberikan emoji, pilih emoji simpel dasar aja, jangan emoji yang terlalu "ramai"'
                    }]
                },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: String(prompt)
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            },
            {
                headers: {
                    'x-goog-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        const usage = response.data?.usageMetadata;

        if (usage) {
            addUsage({
                prompt_tokens: usage.promptTokenCount || 0,
                completion_tokens: usage.candidatesTokenCount || 0,
                total_tokens: usage.totalTokenCount || 0
            });
        }

        const hasil = response.data?.candidates?.[0]
            ?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();

        if (!hasil) {
            throw new Error(
                'Respons Gemini kosong atau tidak dikenali.'
            );
        }

        return hasil;

    } catch (error) {
        const detail = error.response?.data || error.message;

console.error(
    'Gemini API Error:',
    JSON.stringify(
        error.response?.data || error.message,
        null,
        2
    )
);

        throw error;
    }
}

module.exports = Gemini;
