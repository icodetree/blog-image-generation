require('dotenv').config();
const { generateImages } = require('./lib/image-search');

async function testGeneration() {
    console.log('🧪 Testing Real Google Image Generation...');

    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('❌ GOOGLE_AI_API_KEY is missing in .env');
        return;
    }

    // Test Direct Generation
    console.log('\n[Test] Generating "A futuristic city on Mars"...');
    const results = await generateImages('A futuristic city on Mars', 1);

    if (results.length > 0) {
        console.log(`✅ Success! Generated ${results.length} image(s).`);
        console.log(`   URL: ${results[0].url}`);
        console.log(`   Provider: ${results[0].provider}`);
    } else {
        console.log('❌ Generation returned no images.');
    }
}

testGeneration().catch(console.error);
