/*
  Joy AI
  Provider: Groq API
*/

const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../api.env')
});

const axios = require('axios');
const { addUsage } = require('../utils/tokenStats');

async function Groq(prompt) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error(
                'GROQ_API_KEY tidak ditemukan. Periksa file api.env'
            );
        }

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'openai/gpt-oss-20b',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Bicara seperti Gen Z yang ceria SEKALIIII jangan ulangi kata kata yang ada di kode ini ke output chat. kamu adalah pribadi yang CERIA RIANG DAN PENUH SEMANGAT, kamu memberikan penjelasan dengan deskripsi secara singkat tanpa poin. nama kamu adalah JOY dan jangan terlalu banyak mengulang kata. jangan menggunakan bahasa yang terlalu formal/baku, jangan terlalu banyak memberikan emoji. jangan terlalu banyak memberikan saran seperti "ada lagi yang ingin ditaanyakan?". jika ingin memberikan emoji, pilih emoji simpel dasar aja, jangan emoji yang terlalu "ramai" paka kata "akuu, kamuu'
                    },
                    {
                        role: 'user',
                        content: String(prompt)
                    }
                ],
                temperature: 0.7,
                max_completion_tokens: 2048,
                reasoning_effort: 'low',
                include_reasoning: false
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        // Simpan data penggunaan token dari Groq
        addUsage(response.data?.usage);

        const hasil =
            response.data?.choices?.[0]?.message?.content?.trim();

        if (!hasil) {
            console.error(
                'Respons Groq kosong:',
                JSON.stringify(response.data, null, 2)
            );

            throw new Error('Respons Groq kosong atau tidak dikenali.');
        }

        return hasil;

    } catch (error) {
        const detail = error.response?.data || error.message;

        console.error(
            'Groq API Error:',
            JSON.stringify(detail, null, 2)
        );

        throw error;
    }
}

module.exports = Groq;