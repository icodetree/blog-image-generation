const https = require('https');
const ImageProvider = require('./image-provider');

class PexelsProvider extends ImageProvider {
    constructor() {
        super();
        this.name = 'Pexels';
        this.apiKey = process.env.PEXELS_API_KEY;
    }

    async search(query, count) {
        if (!this.apiKey) {
            console.log('  ⚠️ Pexels API 키 없음 (Provider Skipped)');
            return [];
        }

        return new Promise((resolve) => {
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.max(count, 3)}&orientation=landscape`;

            const options = {
                headers: {
                    'Authorization': this.apiKey
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.photos && json.photos.length > 0) {
                            const images = json.photos.slice(0, count).map((img) => ({
                                id: `pexels-${img.id}`,
                                url: img.src.large2x || img.src.large,
                                smallUrl: img.src.medium,
                                thumbUrl: img.src.tiny,
                                alt: img.alt || query,
                                credit: {
                                    name: img.photographer,
                                    link: img.photographer_url
                                },
                                provider: 'Pexels',
                                width: img.width,
                                height: img.height
                            }));
                            resolve(images);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        console.error('  ❌ JSON 파싱 오류 (Pexels):', e.message);
                        resolve([]);
                    }
                });
            }).on('error', (err) => {
                console.error('  ❌ 네트워크 오류 (Pexels):', err.message);
                resolve([]);
            });
        });
    }
}

module.exports = PexelsProvider;
