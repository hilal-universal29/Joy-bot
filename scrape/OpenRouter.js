
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../api.env')
});

const axios = require('axios');
const { addUsage } = require('../utils/tokenStats');

async function OpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY tidak ditemukan.');
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openrouter/free',
                messages: [
                    {
                        role: 'system',
                        content: 'Kamu adalah Joy, bot WhatsApp yang ramah, informatif, dan membantu. Jawab singkat, jelas, gunakan emoji seperlunya, dan ikuti bahasa pengguna.'
                    },
                    {
                        role: 'user',
                        content: String(prompt)
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        addUsage(response.data?.usage);

        const result = response.data?.choices?.[0]?.message?.content?.trim();

        if (!result) {
            throw new Error('Respons OpenRouter kosong.');
        }

        return result;
    } catch (error) {
        console.error(
            'OpenRouter API Error:',
            JSON.stringify(error.response?.data || error.message, null, 2)
        );
        throw error;
    }
}

module.exports = OpenRouter;
