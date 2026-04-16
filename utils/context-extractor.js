/**
 * 🧩 Context Extractor - Message Analysis & Fact Extraction
 * Mesajları analiz ederek öğrenilebilir bilgileri çıkartır
 * LLM-based importance scoring ve filtering
 */

const chalk = require('chalk');
const embeddingService = require('./embedding-service');
const { MemoryStore, LearningStats } = require('../models/GuildMemory');

class ContextExtractor {
    constructor() {
        this.IMPORTANCE_THRESHOLD = 0.6; // 0-1 scale
        this.MIN_CONTENT_LENGTH = 10; // Minimum character length
        this.FACT_TYPES = {
            USER_FACT: 'user_fact',           // Kullanıcı hakkında bilgi
            PREFERENCE: 'preference',          // Tercih/ayarlar
            PROBLEM_SOLUTION: 'problem_solution', // Sorun-çözüm çifti
            SERVER_INSIGHT: 'server_insight',  // Sunucu hakkında insight
            LEARNING: 'learning'              // Teknik bilgi
        };
    }

    /**
     * Mesajı analiz et ve öğrenilebilir facts çıkar
     * @param {Object} message - Discord mesaj objesi
     * @param {string} guildId - Guild ID
     * @returns {Promise<Array>} - Çıkarılan facts
     */
    async extractFromMessage(message, guildId) {
        if (!message || !message.content || !guildId) {
            return [];
        }

        const content = message.content.trim();

        // Min uzunluk kontrolü
        if (content.length < this.MIN_CONTENT_LENGTH) {
            return [];
        }

        // Bot mesajlarını atla
        if (message.author?.bot) {
            return [];
        }

        try {
            const facts = [];

            // Pattern-based extraction
            const patterns = this.extractPatterns(content, message.author?.username);

            for (const pattern of patterns) {
                // Importance score hesapla
                const importance = await this.scoreImportance(pattern.content, pattern.type);

                if (importance >= this.IMPORTANCE_THRESHOLD) {
                    facts.push({
                        type: pattern.type,
                        content: pattern.content,
                        importance,
                        confidence: 0.8,
                        metadata: {
                            messageId: message.id,
                            userId: message.author?.id,
                            username: message.author?.username,
                            channelId: message.channelId,
                            guildId
                        }
                    });
                }
            }

            if (facts.length > 0) {
                console.log(chalk.green(`[EXTRACTOR] ✅ Extracted ${facts.length} facts from message`));
            }

            return facts;

        } catch (error) {
            console.error(chalk.red(`[EXTRACTOR] ❌ Extraction error: ${error.message}`));
            return [];
        }
    }

    /**
     * Pattern-based fact extraction
     * @private
     */
    extractPatterns(content, username) {
        const patterns = [];

        // Pattern 1: "Benim [something]" - Kullanıcı hakkında bilgi
        const userFactRegex = /(?:ben|benim|i'm|i am|i'?ve|my)\s+([^.!?]+)/gi;
        let match;
        while ((match = userFactRegex.exec(content)) !== null) {
            patterns.push({
                type: this.FACT_TYPES.USER_FACT,
                content: `Kullanıcı: ${match[1].trim()}`
            });
        }

        // Pattern 2: "Yapıyorum" / "Geçmişim" vb. - Bilgi
        const activityRegex = /(?:i (?:work|study|code|develop|use)|i'm (?:a|an)|geçmişimde).+(?:[.!?])?/gi;
        while ((match = activityRegex.exec(content)) !== null) {
            patterns.push({
                type: this.FACT_TYPES.LEARNING,
                content: match[0].trim()
            });
        }

        // Pattern 3: Problem-Solution (sorun + çözüm)
        if (content.toLowerCase().includes('problem') || 
            content.toLowerCase().includes('hata') ||
            content.toLowerCase().includes('error')) {
            patterns.push({
                type: this.FACT_TYPES.PROBLEM_SOLUTION,
                content: content.substring(0, 300)
            });
        }

        // Pattern 4: Tercihler
        if (content.toLowerCase().includes('prefer') ||
            content.toLowerCase().includes('like ') ||
            content.toLowerCase().includes('seviyorum') ||
            content.toLowerCase().includes('kullanıyorum')) {
            patterns.push({
                type: this.FACT_TYPES.PREFERENCE,
                content: content.substring(0, 300)
            });
        }

        // Pattern 5: Sunucu hakkında insight
        if (content.toLowerCase().includes('sunucu') ||
            content.toLowerCase().includes('server') ||
            content.toLowerCase().includes('guild')) {
            patterns.push({
                type: this.FACT_TYPES.SERVER_INSIGHT,
                content: content.substring(0, 300)
            });
        }

        return patterns.filter(p => p.content.length >= this.MIN_CONTENT_LENGTH);
    }

    /**
     * LLM kullanarak önem skorlaması yap
     * (Basit heuristic - tam LLM çağrısı yerine)
     * @private
     */
    async scoreImportance(content, factType) {
        try {
            let score = 0.3; // Base score

            // Fact type'a göre ağırlık
            const typeWeights = {
                [this.FACT_TYPES.USER_FACT]: 0.8,
                [this.FACT_TYPES.PREFERENCE]: 0.7,
                [this.FACT_TYPES.PROBLEM_SOLUTION]: 0.85,
                [this.FACT_TYPES.SERVER_INSIGHT]: 0.75,
                [this.FACT_TYPES.LEARNING]: 0.65
            };

            score += typeWeights[factType] || 0.5;

            // İçerik uzunluğu
            if (content.length > 100) score += 0.1;
            if (content.length > 300) score += 0.05;

            // Spesifik keywords
            const importantKeywords = ['sonra', 'after', 'veritabanı', 'database', 'python', 'javascript', 'kod', 'code', 'hata', 'error', 'çapraz', 'cross'];
            const keywordMatches = importantKeywords.filter(kw => 
                content.toLowerCase().includes(kw)
            ).length;
            
            score += keywordMatches * 0.05;

            // 0-1 aralığında normalleştir
            return Math.min(Math.max(score / 2, 0), 1);

        } catch (error) {
            console.error(chalk.yellow(`[EXTRACTOR] ⚠️ Importance scoring failed: ${error.message}`));
            return 0.5; // Default middle score
        }
    }

    /**
     * Çıkarılan facts'ı embedding'le ve MongoDB'ye kaydet
     * @param {Array} facts - Çıkarılan facts
     * @returns {Promise<Array>} - Kaydedilen memory records
     */
    async persistFacts(facts) {
        if (!facts || facts.length === 0) {
            return [];
        }

        const savedRecords = [];

        for (const fact of facts) {
            try {
                // Content'ı embed et
                const embedding = await embeddingService.embedText(fact.content);

                // MongoDB'ye kaydet
                const memoryRecord = new MemoryStore({
                    guildId: fact.metadata.guildId,
                    userId: fact.metadata.userId,
                    username: fact.metadata.username,
                    interaction: {
                        type: fact.type,
                        content: fact.content,
                        embedding
                    },
                    importance: fact.importance,
                    confidence: fact.confidence,
                    context: {
                        channelId: fact.metadata.channelId,
                        messageId: fact.metadata.messageId,
                        conversationTopic: this.extractTopic(fact.content)
                    },
                    source: 'message'
                });

                await memoryRecord.save();
                savedRecords.push(memoryRecord);

                console.log(chalk.cyan(`[EXTRACTOR] 💾 Saved memory: ${fact.type} (importance: ${(fact.importance * 100).toFixed(0)}%)`));

            } catch (error) {
                console.error(chalk.red(`[EXTRACTOR] ❌ Failed to persist fact: ${error.message}`));
            }
        }

        // Learning stats'ı güncelle
        if (savedRecords.length > 0) {
            await this.updateLearningStats(facts[0].metadata.guildId, savedRecords.length);
        }

        return savedRecords;
    }

    /**
     * Learning statistics'ı güncelle
     * @private
     */
    async updateLearningStats(guildId, newMemories) {
        try {
            const { LearningStats } = require('../models/GuildMemory');
            
            await LearningStats.updateOne(
                { guildId },
                {
                    $inc: {
                        totalMemoriesStored: newMemories,
                        totalInteractionsProcessed: 1
                    },
                    lastLearningTime: new Date()
                },
                { upsert: true }
            );
        } catch (error) {
            console.error(chalk.yellow(`[EXTRACTOR] ⚠️ Failed to update stats: ${error.message}`));
        }
    }

    /**
     * İçerikten conversation topic'i çıkar (ilk 50 char)
     * @private
     */
    extractTopic(content) {
        const words = content.split(' ').slice(0, 5);
        return words.join(' ');
    }

    /**
     * Extractor'ı test et
     */
    async test(guildId, userId, username, channelId) {
        console.log(chalk.blue('[EXTRACTOR] 🧪 Running test...'));

        const testMessage = {
            content: "Ben bir Python geliştiricisiyim ve Next.js üzerinde çalışıyor. Veritabanı tasarımında zorluk yaşıyorum ama çözüm buldum.",
            author: { id: userId, username: username, bot: false },
            id: 'test-msg-123',
            channelId: channelId
        };

        const facts = await this.extractFromMessage(testMessage, guildId);
        console.log(chalk.cyan(`[EXTRACTOR] Extracted ${facts.length} facts:`));
        facts.forEach(f => {
            console.log(chalk.cyan(`  - ${f.type}: "${f.content.substring(0, 50)}..." (importance: ${(f.importance * 100).toFixed(0)}%)`));
        });

        return facts;
    }
}

// Singleton instance
const contextExtractor = new ContextExtractor();

module.exports = contextExtractor;
