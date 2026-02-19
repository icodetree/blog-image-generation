/**
 * Keyword Translator
 * Automatically translates Korean keywords to English using the active LLM.
 */

const { openai, anthropic, activeProvider } = require('./llm');

/**
 * Detects if text contains Korean characters
 */
function hasKorean(text) {
    return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
}

/**
 * Translates keywords to English
 * @param {string[]} keywords 
 * @returns {Promise<string[]>}
 */
async function translateKeywords(keywords) {
    // 1. Check if translation is needed
    const needsTranslation = keywords.some(k => hasKorean(k));
    if (!needsTranslation) return keywords;

    const keywordString = keywords.join(', ');
    console.log(`  🌐 Translating keywords: "${keywordString}"`);

    const prompt = `
    Translate the following keywords to English for an image search engine (Unsplash).
    Keywords: "${keywordString}"
    
    Rules:
    1. Return ONLY the translated keywords separated by commas.
    2. Use simple, visual terms.
    3. No explanations, no JSON.
  `;

    try {
        let translatedText = '';

        if (activeProvider === 'anthropic') {
            const msg = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 100,
                messages: [{ role: "user", content: prompt }]
            });
            translatedText = msg.content[0].text;
        } else if (activeProvider === 'openai') {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100
            });
            translatedText = response.choices[0].message.content;
        } else {
            console.warn('  ⚠️ No suitable AI provider for translation.');
            return keywords; // Fallback to original
        }

        const translatedKeywords = translatedText.split(',').map(s => s.trim());
        console.log(`  ✓ Translated: "${translatedKeywords.join(', ')}"`);
        return translatedKeywords;

    } catch (error) {
        console.error(`  ❌ Translation failed: ${error.message}`);
        return keywords;
    }
}

module.exports = { hasKorean, translateKeywords };
