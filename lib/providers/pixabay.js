const https = require('https');
const ImageProvider = require('./image-provider');

class PixabayProvider extends ImageProvider {
    constructor() {
        super();
        this.name = 'Pixabay';
        this.apiKey = process.env.PIXABAY_API_KEY;
    }

    async search(query, count) {
        if (!this.apiKey) {
            console.log('  ⚠️ Pixabay API 키 없음 (Provider Skipped)');
            return [];
        }

        return new Promise((resolve) => {
            const url = `https://pixabay.com/api/?key=${this.apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${Math.max(count, 3)}`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.hits && json.hits.length > 0) {
                            const images = json.hits.slice(0, count).map((img) => ({
                                id: `pixabay-${img.id}`,
                                url: img.largeImageURL,
                                smallUrl: img.webformatURL,
                                thumbUrl: img.previewURL,
                                alt: img.tags || query,
                                credit: {
                                    name: img.user,
                                    link: img.pageURL
                                },
                                provider: 'Pixabay',
                                width: img.imageWidth,
                                height: img.imageHeight
                            }));
                            resolve(images);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        console.error('  ❌ JSON 파싱 오류 (Pixabay):', e.message);
                        resolve([]);
                    }
                });
            }).on('error', (err) => {
                console.error('  ❌ 네트워크 오류 (Pixabay):', err.message);
                resolve([]);
            });
        });
    }
}

module.exports = PixabayProvider;
