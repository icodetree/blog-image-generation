const https = require('https');
const ImageProvider = require('./image-provider');

class UnsplashProvider extends ImageProvider {
    constructor() {
        super();
        this.name = 'Unsplash';
        this.accessKey = process.env.UNSPLASH_ACCESS_KEY;
    }

    async search(query, count) {
        if (!this.accessKey || this.accessKey === 'your_unsplash_access_key') {
            console.log('  ⚠️ Unsplash API 키 없음 (Provider Skipped)');
            return [];
        }

        return new Promise((resolve) => {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.max(count, 5)}&orientation=landscape`;

            const options = {
                headers: {
                    'Authorization': `Client-ID ${this.accessKey}`,
                    'Accept-Version': 'v1'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.errors) {
                            console.error('  ❌ Unsplash API 오류:', json.errors);
                            return resolve([]);
                        }

                        const results = json.results || [];
                        if (results.length === 0) {
                            return resolve([]);
                        }

                        const images = results.slice(0, count).map((img) => ({
                            id: img.id,
                            url: img.urls.regular,
                            smallUrl: img.urls.small,
                            thumbUrl: img.urls.thumb,
                            rawUrl: img.urls.raw,
                            alt: img.alt_description || img.description || query,
                            credit: {
                                name: img.user.name,
                                link: `${img.user.links.html}?utm_source=blog_image_tool&utm_medium=referral`
                            },
                            width: img.width,
                            height: img.height,
                            color: img.color,
                            provider: 'Unsplash'
                        }));

                        resolve(images);
                    } catch (e) {
                        console.error('  ❌ JSON 파싱 오류 (Unsplash):', e.message);
                        resolve([]);
                    }
                });
            }).on('error', (err) => {
                console.error('  ❌ 네트워크 오류 (Unsplash):', err.message);
                resolve([]);
            });
        });
    }
}

module.exports = UnsplashProvider;
