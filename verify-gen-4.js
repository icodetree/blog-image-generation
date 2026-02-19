require('dotenv').config();
const { generateImages } = require('./lib/image-search');

// Mocking the provider's modelName for the test
const GoogleGenAIProvider = require('./lib/providers/google-genai');

async function testGeneration() {
    console.log('🧪 Testing Real Google Image Generation (Imagen 4.0)...');

    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('❌ GOOGLE_AI_API_KEY is missing in .env');
        return;
    }

    const provider = new GoogleGenAIProvider();

    // Override model to test Imagen 4.0 Fast
    provider.modelName = 'imagen-4.0-fast-generate-001';
    console.log(`\n[Test] Generating with ${provider.modelName}...`);
    try {
        const results = await provider.generate('A futuristic city on Mars', 1);
        if (results.length > 0) {
            console.log(`✅ Success! Generated ${results.length} image(s).`);
            console.log(`   URL: ${results[0].url}`);
        } else {
            console.log('❌ Generation returned no images.');
        }
    } catch (e) {
        console.error('Error:', e);
    }

    // Override model to test Imagen 4.0 Standard
    provider.modelName = 'imagen-4.0-generate-001';
    console.log(`\n[Test] Generating with ${provider.modelName}...`);
    try {
        const results = await provider.generate('A futuristic city on Mars', 1);
        if (results.length > 0) {
            console.log(`✅ Success! Generated ${results.length} image(s).`);
            console.log(`   URL: ${results[0].url}`);
        } else {
            console.log('❌ Generation returned no images.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testGeneration().catch(console.error);
