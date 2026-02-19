const { analyzeBlogPost } = require('./lib/analyzer');
require('dotenv').config();

async function testMarkerParsing() {
    console.log('🧪 Testing Marker Parsing with Source...');

    const mockHtml = `
    <h2>Intro</h2>
    <!-- IMAGE: keywords="Mars City", layout="image-single-landscape", source="generate" -->
    <p>Test content.</p>
  `;

    const result = await analyzeBlogPost(mockHtml);

    if (result.sections.length > 0) {
        const section = result.sections[0];
        console.log('  => Markers Found:', result.sections.length);
        console.log('  => Keywords:', section.searchKeywords);
        console.log('  => Source Attribute:', section.source);

        if (section.source === 'generate') {
            console.log('✅ Source parsing SUCCESS');
        } else {
            console.log('❌ Source parsing FAILED');
        }
    } else {
        console.log('❌ No markers found');
    }
}

testMarkerParsing().catch(console.error);
