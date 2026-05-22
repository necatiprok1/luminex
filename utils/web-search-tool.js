/**
 * 🌐 Web Search Tool - Tavily Integration
 * Veritabanında yeterli bilgi yoksa internette arama yapar
 * Sonuçları hem KnowledgeBase'ye kaydet hem kullanıcıya döndür
 */

const axios = require('axios');
const chalk = require('chalk');
const embeddingService = require('./embedding-service');
const { KnowledgeBase, LearningStats } = require('../models/GuildMemory');

class WebSearchTool {
    constructor() {
        this.TAVILY_API_KEY = process.env.TAVILY_API_KEY || null;
        this.TAVILY_API_URL = 'https://api.tavily.com/search';
        this.MAX_RESULTS = 5;
        this.MAX_SEARCH_RETRIES = 2;
        this.searchCache = new Map(); // In-memory cache (3-day TTL)
        this.enabled = false;
        this.initialized = false;
    }

    /**
     * Web search tool'unu başlat
     */
    async initialize() {
        try {
            console.log(chalk.blue('[WEBSEARCH] ⏳ Web search tool initializing...'));

            if (!this.TAVILY_API_KEY) {
                console.warn(chalk.yellow('[WEBSEARCH] ⚠️ TAVILY_API_KEY not configured - web search disabled'));
                this.enabled = false;
                this.initialized = true;
                return false;
            }

            // API key'i test et
            const testResult = await this.validateApiKey();

            if (testResult) {
                this.enabled = true;
                console.log(chalk.green('[WEBSEARCH] ✅ Tavily API validated successfully'));
            } else {
                console.warn(chalk.yellow('[WEBSEARCH] ⚠️ Tavily API validation failed - web search disabled'));
                this.enabled = false;
            }

            this.initialized = true;
            return this.enabled;

        } catch (error) {
            console.error(chalk.red(`[WEBSEARCH] ❌ Initialization error: ${error.message}`));
            this.enabled = false;
            this.initialized = true;
            return false;
        }
    }

    /**
     * Tavily API key'i valide et
     * @private
     */
    async validateApiKey() {
        try {
            const response = await axios.post(
                this.TAVILY_API_URL,
                {
                    api_key: this.TAVILY_API_KEY,
                    query: 'test', // Simple test query
                    max_results: 1
                },
                { timeout: 10000 }
            );

            return response.data && response.data.results;

        } catch (error) {
            console.error(chalk.red(`[WEBSEARCH] ❌ API validation failed: ${error.message}`));
            return false;
        }
    }

    /**
     * Web araması yap
     * @param {string} query - Arama sorgusu
     * @param {string} guildId - Guild ID (optional, for storing results)
     * @returns {Promise<Object>} - Arama sonuçları
     */
    async search(query, guildId = null) {
        if (!this.enabled || !this.initialized) {
            return {
                success: false,
                error: 'Web search is not enabled',
                results: []
            };
        }

        if (!query || typeof query !== 'string') {
            return {
                success: false,
                error: 'Invalid query',
                results: []
            };
        }

        // Cache'i kontrol et (3 gün TTL)
        const cached = this.searchCache.get(query);
        if (cached && (Date.now() - cached.cachedAt < 3 * 24 * 60 * 60 * 1000)) {
            console.log(chalk.cyan('[WEBSEARCH] ⚡ Returning cached result'));
            return {
                success: true,
                results: cached.results,
                cached: true
            };
        } else if (cached) {
            // TTL expired
            this.searchCache.delete(query);
        }

        let lastError = null;

        // Retry logic
        for (let attempt = 0; attempt < this.MAX_SEARCH_RETRIES; attempt++) {
            try {
                console.log(chalk.blue(`[WEBSEARCH] 🔍 Searching: "${query}"`));

                const response = await axios.post(
                    this.TAVILY_API_URL,
                    {
                        api_key: this.TAVILY_API_KEY,
                        query: query,
                        max_results: this.MAX_RESULTS,
                        include_answer: true,
                        include_raw_content: false
                    },
                    { timeout: 30000 }
                );

                if (!response.data || !response.data.results) {
                    throw new Error('Invalid API response format');
                }

                const results = response.data.results.map((result, idx) => ({
                    rank: idx + 1,
                    title: result.title,
                    content: result.content || result.snippet || '',
                    url: result.url,
                    score: result.score || 1.0
                }));

                // Cache'e kaydet (timestamp-based, periyodik cleanup ile)
                this.searchCache.set(query, {
                    results,
                    cachedAt: Date.now()
                });

                console.log(chalk.green(`[WEBSEARCH] ✅ Found ${results.length} results`));

                // Eğer guildId varsa sonuçları KnowledgeBase'ye kaydet
                if (guildId) {
                    await this.storeResultsToKnowledgeBase(query, results, guildId);
                }

                return {
                    success: true,
                    results,
                    query
                };

            } catch (error) {
                lastError = error;

                if (attempt < this.MAX_SEARCH_RETRIES - 1) {
                    console.warn(chalk.yellow(`[WEBSEARCH] ⚠️ Attempt ${attempt + 1} failed, retrying...`));
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        console.error(chalk.red(`[WEBSEARCH] ❌ Search failed: ${lastError?.message}`));
        
        return {
            success: false,
            error: lastError?.message || 'Search failed',
            results: []
        };
    }

    /**
     * Arama sonuçlarını KnowledgeBase'ye kaydet
     * @private
     */
    async storeResultsToKnowledgeBase(query, results, guildId) {
        try {
            console.log(chalk.blue(`[WEBSEARCH] 💾 Storing ${results.length} results to KnowledgeBase...`));

            for (const result of results) {
                try {
                    // Sonucu embed et
                    const embedding = await embeddingService.embedText(result.content);

                    // KnowledgeBase'ye kaydet
                    const doc = new KnowledgeBase({
                        guildId,
                        title: result.title,
                        content: result.content.substring(0, 5000), // 5K character limit
                        embedding,
                        source: 'web',
                        sourceUrl: result.url,
                        metadata: {
                            searchQuery: query,
                            language: 'tr'
                        },
                        relevanceScore: result.score || 0.8
                    });

                    await doc.save();
                    console.log(chalk.cyan(`[WEBSEARCH] 📄 Stored: "${result.title.substring(0, 50)}..."`));

                } catch (error) {
                    console.error(chalk.red(`[WEBSEARCH] ❌ Failed to store result: ${error.message}`));
                }
            }

            // Learning stats'ı güncelle
            const { LearningStats } = require('../models/GuildMemory');
            await LearningStats.updateOne(
                { guildId },
                { $inc: { totalDocumentsIngested: results.length } },
                { upsert: true }
            );

            console.log(chalk.green(`[WEBSEARCH] ✅ Results stored successfully`));

        } catch (error) {
            console.error(chalk.red(`[WEBSEARCH] ❌ Storage error: ${error.message}`));
        }
    }

    /**
     * Arama sonuçlarını Discord embed'i olarak formatla
     * @param {Array} results - Arama sonuçları
     * @returns {Object} - Discord EmbedBuilder parameter
     */
    formatResultsAsEmbed(results) {
        if (!results || results.length === 0) {
            return {
                color: 0xFF6B6B,
                title: '❌ Sonuç Bulunamadı',
                description: 'Arama için uygun sonuç bulunamadı.'
            };
        }

        const firstResult = results[0];
        const otherResults = results.slice(1);

        const embedData = {
            color: 0x4ECDC4,
            title: '🔍 Web Arama Sonuçları',
            fields: [
                {
                    name: `📌 Ana Sonuç: ${firstResult.title}`,
                    value: firstResult.content.substring(0, 300) + (firstResult.content.length > 300 ? '...' : ''),
                    inline: false
                }
            ]
        };

        // Diğer sonuçları add et (en fazla 3 tane)
        otherResults.slice(0, 3).forEach((result, idx) => {
            embedData.fields.push({
                name: `${idx + 2}️⃣ ${result.title.substring(0, 50)}`,
                value: `[Bağlantı](${result.url})`,
                inline: true
            });
        });

        embedData.footer = {
            text: `${results.length} sonuç bulundu • Tavily API`
        };

        return embedData;
    }

    /**
     * Web search'ün aktif olup olmadığını kontrol et
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Cache'i temizle
     */
    clearCache() {
        const size = this.searchCache.size;
        this.searchCache.clear();
        console.log(chalk.yellow(`[WEBSEARCH] 🧹 Cache cleared (${size} entries)`));
    }

    /**
     * Service status'unu getir
     */
    getStatus() {
        return {
            enabled: this.enabled,
            initialized: this.initialized,
            cacheSize: this.searchCache.size,
            maxResults: this.MAX_RESULTS,
            retries: this.MAX_SEARCH_RETRIES
        };
    }
}

// Singleton instance
const webSearchTool = new WebSearchTool();

module.exports = webSearchTool;
