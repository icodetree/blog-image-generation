/**
 * Shared LLM Client (OpenAI / Anthropic / Google)
 */
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();

const config = {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    googleKey: process.env.GOOGLE_AI_API_KEY,
};

let clients = {
    openai: null,
    anthropic: null,
    google: null,
    activeProvider: 'none'
};

// Initialize Clients
if (config.anthropicKey && config.anthropicKey.startsWith('sk-ant-')) {
    clients.anthropic = new Anthropic({ apiKey: config.anthropicKey });
    clients.activeProvider = 'anthropic';
}

if (config.openaiKey && config.openaiKey !== 'sk-xxxxx') {
    clients.openai = new OpenAI({ apiKey: config.openaiKey });
    // Prefer Anthropic if available (as per original logic), or OpenAI
    if (clients.activeProvider === 'none') clients.activeProvider = 'openai';
}

if (config.googleKey) {
    clients.google = new GoogleGenerativeAI(config.googleKey);
    // Google is an additional provider, mostly for generation/multimodal
}

module.exports = clients;
