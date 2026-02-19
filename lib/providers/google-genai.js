const { GoogleGenerativeAI } = require('@google/generative-ai');
const ImageProvider = require('./image-provider');

class GoogleGenAIProvider extends ImageProvider {
    constructor() {
        super();
        this.name = 'GoogleGenAI';
        this.apiKey = process.env.GOOGLE_AI_API_KEY;
        this.modelName = process.env.IMAGE_GEN_MODEL || 'imagen-4.0-fast-generate-001';

        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            console.log(`  🤖 Google GenAI Provider Initialized (${this.modelName})`);
        }
    }

    // Google GenAI does not support "search", only "generate"
    async search(query, count) {
        return [];
    }

    async generate(prompt, count = 1) {
        if (!this.apiKey) {
            console.log('  ⚠️ Google AI API Key missing');
            return [];
        }

        try {
            console.log(`  🎨 Generating ${count} image(s) with ${this.modelName}: "${prompt}"`);

            // Imagen 3 via Gemini API (REST)
            // Docs: https://ai.google.dev/gemini-api/docs/imagen
            // Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predict

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:predict?key=${this.apiKey}`;

            const payload = {
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: count,
                    aspectRatio: "16:9" // Default to landscape for blog
                    // personGeneration: "allow_adult", // Optional: depending on policy
                    // safetySettings: ... 
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Google API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();

            // Response format for Imagen 3 on Gemini API:
            // { predictions: [ { bytesBase64Encoded: "..." }, ... ] }

            if (!data.predictions || data.predictions.length === 0) {
                console.warn('  ⚠️ No predictions returned from Google AI');
                return [];
            }

            // Convert Base64 matches to "Data URL" or save to file?
            // The front-end expects a URL.
            // Option A: Return Data URL (Easy, but large HTML)
            // Option B: Save to disk and return local URL (Better for persistence)

            // Let's implement Option B: Save to output folder
            const fs = require('fs');
            const path = require('path');
            const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output', 'images');

            if (!fs.existsSync(OUTPUT_DIR)) {
                fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            }

            const images = data.predictions.map((pred, i) => {
                const base64Data = pred.bytesBase64Encoded;
                if (!base64Data) return null;

                const filename = `gen-${Date.now()}-${i}.png`;
                const filepath = path.join(OUTPUT_DIR, filename);

                fs.writeFileSync(filepath, base64Data, 'base64');
                console.log(`  ✓ Image saved: ${filename}`);

                // Return object compatible with the app's image structure
                return {
                    id: `gen-${Date.now()}-${i}`,
                    url: `/images/${filename}`, // Served by express static
                    // absolutePath: filepath,
                    alt: prompt,
                    credit: { name: 'Google Imagen 3', link: 'https://deepmind.google/technologies/imagen-3/' },
                    provider: 'GoogleGenAI'
                };
            }).filter(Boolean);

            return images;

        } catch (error) {
            console.error('  ❌ Google Image Gen Error:', error.message);
            // Fallback to placeholder if generation fails, so the flow doesn't break
            return [];
        }
    }
}

module.exports = GoogleGenAIProvider;
