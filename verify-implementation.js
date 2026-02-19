require('dotenv').config();
const { searchImages, generateImages } = require('./lib/image-search');

async function test() {
    console.log('🧪 Testing Frontend Control Logic...');

    // Test 1: Search WITHOUT Fallback (Should NOT generate even if search fails)
    console.log('\n[Test 1] Search "impossible_keyword_xyz" without fallback...');
    // Mocking search failure by using nonsense keyword + no fallback option
    // Note: Unsplash/Pixabay might return something random, but unlikely for this string.
    const results1 = await searchImages(['impossible_keyword_123456789'], 1, { fallbackToGen: false });
    console.log(`  => Found: ${results1.length}`);
    console.log(`  => Provider: ${results1[0]?.provider || 'None'}`);

    // Test 2: Search WITH Fallback (Should generate)
    console.log('\n[Test 2] Search "impossible_keyword_xyz" WITH fallback...');
    const results2 = await searchImages(['impossible_keyword_123456789'], 1, { fallbackToGen: true });
    console.log(`  => Found: ${results2.length}`);
    console.log(`  => Provider: ${results2[0]?.provider}`);

    // Test 3: Quick Generation Logic (Simulated by calling generateImages directly, 
    // but let's confirm the 'generate' path works as expected as used in server.js)
    console.log('\n[Test 3] Direct Generation (Nano Banana)...');
    const results3 = await generateImages('Futuristic AI UI', 1);
    console.log(`  => Generated: ${results3.length > 0}`);
    console.log(`  => Provider: ${results3[0]?.provider}`);
}

test().catch(console.error);
