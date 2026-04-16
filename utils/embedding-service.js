/**
 * 🧠 Embedding Service - Ollama Integration
 * Nomic-embed-text model için embedding işlemlerini yönetir
 * Dinamik boyut tespiti ve batch processing desteği
 */

const axios = require('axios');
const chalk = require('chalk');

class EmbeddingService {
    constructor() {
        this.OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
        this.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
        this.EMBEDDING_DIM = null; // Dinamik olarak tespit edilecek
        this.BATCH_SIZE = 100;
        this.RETRY_ATTEMPTS = 3;
        this.RETRY_DELAY = 1000; // ms
        this.embeddingCache = new Map(); // Basit cache
        this.initialized = false;
    }

    /**
     * Service'i başlat ve embedding boyutunu tespit et
     */
    async initialize() {
        try {
            console.log(chalk.blue('[EMBEDDING] ⏳ Initialization başlanıyor...'));
            
            // Ollama connectivity check
            const testEmbed = await this.embedText('test initialization string', true);
            
            if (!testEmbed || !Array.isArray(testEmbed) || testEmbed.length === 0) {
                throw new Error('Ollama API invalid response format');
            }
            
            this.EMBEDDING_DIM = testEmbed.length;
            this.initialized = true;
            
            console.log(chalk.green(`[EMBEDDING] ✅ Service initialized`));
            console.log(chalk.cyan(`    Model: ${this.EMBEDDING_MODEL}`));
            console.log(chalk.cyan(`    Dimensions: ${this.EMBEDDING_DIM}`));
            console.log(chalk.cyan(`    Batch Size: ${this.BATCH_SIZE}`));
            
            return true;
        } catch (error) {
            console.error(chalk.red(`[EMBEDDING] ❌ Initialization failed: ${error.message}`));
            console.error(chalk.red(`    URL: ${this.OLLAMA_URL}`));
            console.warn(chalk.yellow(`[EMBEDDING] ⚠️ Fallback mode aktiviert - Bot RAG olmadan çalışacak`));
            console.warn(chalk.yellow(`[EMBEDDING] 💡 İpucu: Ollama modellerini indirmek için:`));
            console.warn(chalk.cyan(`    ollama pull ${this.EMBEDDING_MODEL}`));
            console.warn(chalk.cyan(`    ollama pull gemma3:4b`));
            this.initialized = false;
            return false;  // Fallback mode
        }
    }

    /**
     * Tekil metin embed et
     * @param {string} text - Embed edilecek metin
     * @param {boolean} skipCache - Cache'i bypass et (initialization için)
     * @returns {Promise<number[]>} - Embeddings array (768 dimensions)
     */
    async embedText(text, skipCache = false) {
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid input: text must be a non-empty string');
        }

        // Cache lookup (initialization sırasında skipCache = true)
        if (!skipCache) {
            const cached = this.embeddingCache.get(text);
            if (cached) return cached;
        }

        let lastError = null;

        // Retry logic
        for (let attempt = 0; attempt < this.RETRY_ATTEMPTS; attempt++) {
            try {
                const response = await axios.post(
                    `${this.OLLAMA_URL}/api/embed`,
                    {
                        model: this.EMBEDDING_MODEL,
                        input: text.trim() // Trim whitespace
                    },
                    {
                        timeout: 30000,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

                if (!response.data || !response.data.embeddings) {
                    throw new Error('Invalid API response structure');
                }

                const embedding = response.data.embeddings[0];
                
                if (!Array.isArray(embedding) || embedding.length === 0) {
                    throw new Error('Empty embedding received');
                }

                // Cache the result
                if (!skipCache) {
                    this.embeddingCache.set(text, embedding);
                }

                return embedding;

            } catch (error) {
                lastError = error;
                
                // Eğer son attempt değilse beklemeyi dene
                if (attempt < this.RETRY_ATTEMPTS - 1) {
                    const delay = this.RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
                    console.warn(
                        chalk.yellow(`[EMBEDDING] ⚠️ Attempt ${attempt + 1}/${this.RETRY_ATTEMPTS} failed, retrying in ${delay}ms...`)
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Embedding failed after ${this.RETRY_ATTEMPTS} attempts: ${lastError?.message}`);
    }

    /**
     * Batch işlemde metinleri embed et
     * @param {string[]} texts - Embed edilecek metinler
     * @returns {Promise<Array<{text: string, embedding: number[], error?: string}>>}
     */
    async embedBatch(texts) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid input: texts must be non-empty array');
        }

        const results = [];
        const batches = this.createBatches(texts);

        console.log(chalk.blue(`[EMBEDDING] 📦 Processing ${texts.length} texts in ${batches.length} batches...`));

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
            const batch = batches[batchIdx];
            
            for (const text of batch) {
                try {
                    const embedding = await this.embedText(text);
                    results.push({
                        text,
                        embedding,
                        error: null
                    });
                } catch (error) {
                    console.error(chalk.red(`[EMBEDDING] ❌ Failed to embed text: ${text.substring(0, 50)}...`));
                    results.push({
                        text,
                        embedding: null,
                        error: error.message
                    });
                }
            }

            const progress = Math.round(((batchIdx + 1) / batches.length) * 100);
            console.log(chalk.cyan(`[EMBEDDING] Progress: ${progress}% (Batch ${batchIdx + 1}/${batches.length})`));
        }

        const successCount = results.filter(r => !r.error).length;
        console.log(chalk.green(`[EMBEDDING] ✅ Batch complete: ${successCount}/${texts.length} succeeded`));

        return results;
    }

    /**
     * Metin dizisini batch'lere böl
     * @private
     */
    createBatches(items) {
        const batches = [];
        for (let i = 0; i < items.length; i += this.BATCH_SIZE) {
            batches.push(items.slice(i, i + this.BATCH_SIZE));
        }
        return batches;
    }

    /**
     * Model bilgilerini getir
     */
    getModelInfo() {
        if (!this.initialized) {
            return {
                model: this.EMBEDDING_MODEL,
                dimensions: null,
                status: 'not_initialized'
            };
        }

        return {
            model: this.EMBEDDING_MODEL,
            dimensions: this.EMBEDDING_DIM,
            status: 'ready',
            cacheSize: this.embeddingCache.size,
            batchSize: this.BATCH_SIZE,
            url: this.OLLAMA_URL
        };
    }

    /**
     * Cache'i temizle
     */
    clearCache() {
        const size = this.embeddingCache.size;
        this.embeddingCache.clear();
        console.log(chalk.yellow(`[EMBEDDING] 🧹 Cache cleared (${size} entries removed)`));
    }

    /**
     * Similarity score hesapla (cosine similarity)
     * @param {number[]} vec1 - Birinci embedding
     * @param {number[]} vec2 - İkinci embedding
     * @returns {number} - 0 ile 1 arasında similarity score
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) {
            throw new Error('Invalid vectors for similarity calculation');
        }

        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            magnitude1 += vec1[i] ** 2;
            magnitude2 += vec2[i] ** 2;
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Embedding dimension'ı döndür
     */
    getDimension() {
        return this.EMBEDDING_DIM;
    }

    /**
     * Service'in hazır olup olmadığını kontrol et
     */
    isReady() {
        return this.initialized && this.EMBEDDING_DIM !== null;
    }
}

// Singleton instance
const embeddingService = new EmbeddingService();

module.exports = embeddingService;
