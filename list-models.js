require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        console.error('API Key missing');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('Available Models:');
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes('image') || m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                    console.log(`  Supported: ${m.supportedGenerationMethods}`);
                }
            });
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
