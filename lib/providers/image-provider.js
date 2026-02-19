/**
 * Base class for Image Providers
 */
class ImageProvider {
    constructor() {
        this.name = 'BaseProvider';
    }

    /**
     * Search for images
     * @param {string} query - Search keywords
     * @param {number} count - Number of images needed
     * @returns {Promise<Object[]>} - Array of image objects
     */
    async search(query, count) {
        throw new Error('Method not implemented');
    }

    /**
     * Generate images (optional)
     * @param {string} prompt - Image generation prompt
     * @param {number} count - Number of images needed
     * @returns {Promise<Object[]>} - Array of image objects
     */
    async generate(prompt, count) {
        throw new Error('Method not implemented');
    }
}

module.exports = ImageProvider;
