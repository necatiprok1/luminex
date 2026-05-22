/**
 * 🧬 Self-Evolution System - Continuous Learning Loop
 * Mesajları analiz ederek hafızayı günceller, periyodik temizlik yapılır
 */

const chalk = require('chalk');
const contextExtractor = require('./context-extractor');
const embeddingService = require('./embedding-service');
const { MemoryStore, LearningStats } = require('../models/GuildMemory');

class SelfEvolution {
    constructor() {
        this.LEARNING_TASK_INTERVAL = 6 * 60 * 60 * 1000; // 6 saat
        this.CLEANUP_TASK_INTERVAL = 12 * 60 * 60 * 1000; // 12 saat
        this.MIN_IMPORTANCE_FOR_PERMANENT = 0.7; // Kalıcı kayıt için
        this.MAX_MEMORY_RETENTION_DAYS = 30;
        this.tasksInitialized = false;
        this.activeGuilds = new Set();
    }

    /**
     * Self-evolution sistem'ini başlat
     */
    async initialize() {
        try {
            console.log(chalk.blue('[EVOLUTION] ⏳ Self-evolution system initializing...'));

            // Periyodik learning task
            this.startLearningTask();

            // Periyodik cleanup task
            this.startCleanupTask();

            // Periyodik stats kompilasyon
            this.startStatsCompilationTask();

            this.tasksInitialized = true;

            console.log(chalk.green('[EVOLUTION] ✅ Self-evolution system initialized'));
            console.log(chalk.cyan(`    Learning task interval: 6 hours`));
            console.log(chalk.cyan(`    Cleanup task interval: 12 hours`));
            console.log(chalk.cyan(`    Memory retention: ${this.MAX_MEMORY_RETENTION_DAYS} days`));

            return true;
        } catch (error) {
            console.error(chalk.red(`[EVOLUTION] ❌ Initialization failed: ${error.message}`));
            return false;
        }
    }

    /**
     * Mesaj event'ini işle (messageCreate'den çağrılacak)
     * @param {Object} message - Discord message
     */
    async processMessage(message) {
        if (!message || message.author?.bot || !message.guildId) {
            return;
        }

        try {
            // Aktif guild'i kaydet
            this.activeGuilds.add(message.guildId);

            // Fact'ları çıkar
            const facts = await contextExtractor.extractFromMessage(message, message.guildId);

            if (facts.length > 0) {
                // Kalıcı hafızaya kaydet
                const savedRecords = await contextExtractor.persistFacts(facts);
                
                console.log(chalk.blue(`[EVOLUTION] 🧠 Learned ${savedRecords.length} facts from ${message.author.username}`));
            }

        } catch (error) {
            console.error(chalk.red(`[EVOLUTION] ❌ Message processing error: ${error.message}`));
        }
    }

    /**
     * Learning task - Verileri birleştir, geçerliliğini kontrol et
     * @private
     */
    startLearningTask() {
        setInterval(async () => {
            console.log(chalk.blue('[EVOLUTION] 📚 Running learning consolidation task...'));

            try {
                // Yüksek önem skorlu memories'i permanent facts'a dönüştür
                const importantMemories = await MemoryStore.find({
                    importance: { $gte: this.MIN_IMPORTANCE_FOR_PERMANENT },
                    status: 'active'
                }).lean();

                for (const memory of importantMemories) {
                    // Benzer memories'i kontrol et (deduplication)
                    const similar = await this.findSimilarMemories(
                        memory.guildId,
                        memory.interaction.embedding,
                        memory._id
                    );

                    if (similar.length > 0) {
                        // Merge et ve gereksiz olanları deprecated yap
                        await this.mergeMemories(memory, similar);
                    }
                }

                console.log(chalk.green(`[EVOLUTION] ✅ Learning consolidation complete (${importantMemories.length} candidates)`));

            } catch (error) {
                console.error(chalk.red(`[EVOLUTION] ❌ Learning task error: ${error.message}`));
            }

        }, this.LEARNING_TASK_INTERVAL);

        console.log(chalk.cyan(`[EVOLUTION] ⏰ Learning task scheduled every 6 hours`));
    }

    /**
     * Cleanup task - TTL'i geçmiş verileri temizle
     * @private
     */
    startCleanupTask() {
        setInterval(async () => {
            console.log(chalk.blue('[EVOLUTION] 🧹 Running memory cleanup task...'));

            try {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - this.MAX_MEMORY_RETENTION_DAYS);

                // Eski ve düşük önem skorlu memories'i temizle
                const result = await MemoryStore.deleteMany({
                    $and: [
                        { createdAt: { $lt: cutoffDate } },
                        { importance: { $lt: 0.4 } }
                    ]
                });

                if (result.deletedCount > 0) {
                    console.log(chalk.yellow(`[EVOLUTION] 🗑️ Deleted ${result.deletedCount} old low-importance memories`));
                }

                // En düşük skoru olanları inceleme altına al
                const deprecatedCount = await MemoryStore.countDocuments({ status: 'deprecated' });
                if (deprecatedCount > 1000) {
                    await MemoryStore.deleteMany({
                        status: 'deprecated',
                        lastUpdated: { $lt: cutoffDate }
                    });
                }

                console.log(chalk.green(`[EVOLUTION] ✅ Cleanup complete`));

            } catch (error) {
                console.error(chalk.red(`[EVOLUTION] ❌ Cleanup task error: ${error.message}`));
            }

        }, this.CLEANUP_TASK_INTERVAL);

        console.log(chalk.cyan(`[EVOLUTION] ⏰ Cleanup task scheduled every 12 hours`));
    }

    /**
     * Stats compilation task - Learning istatistiklerini güncelle
     * @private
     */
    startStatsCompilationTask() {
        setInterval(async () => {
            console.log(chalk.blue('[EVOLUTION] 📊 Compiling learning statistics...'));

            try {
                const { LearningStats } = require('../models/GuildMemory');

                for (const guildId of this.activeGuilds) {
                    // Günlük stats
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const todayCount = await MemoryStore.countDocuments({
                        guildId,
                        createdAt: { $gte: today }
                    });

                    // Guild stats'ı güncelle
                    await LearningStats.updateOne(
                        { guildId },
                        {
                            $push: {
                                dailyStats: {
                                    date: new Date(),
                                    interactionsProcessed: todayCount
                                }
                            },
                            $set: { updatedAt: new Date() }
                        },
                        { upsert: true }
                    );
                }

                console.log(chalk.green(`[EVOLUTION] ✅ Statistics compiled for ${this.activeGuilds.size} guilds`));

            } catch (error) {
                console.error(chalk.red(`[EVOLUTION] ❌ Stats compilation error: ${error.message}`));
            }

        }, this.LEARNING_TASK_INTERVAL * 2); // 12 saat

        console.log(chalk.cyan(`[EVOLUTION] ⏰ Stats compilation scheduled every 12 hours`));
    }

    /**
     * Benzer memories'i bul (deduplication için)
     * @private
     */
    async findSimilarMemories(guildId, embedding, excludeId) {
        try {
            // Pre-filter: sadece son 7 gün, aktif, embedding olan ve yüksek önem skorlu olanlar
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);

            const allMemories = await MemoryStore.find({
                guildId,
                _id: { $ne: excludeId },
                status: 'active',
                importance: { $gte: 0.5 },
                createdAt: { $gte: cutoffDate },
                'interaction.embedding': { $exists: true }
            })
            .limit(100) // Max 100 aday ile sınırla
            .lean();

            const similar = [];

            for (const memory of allMemories) {
                try {
                    const similarity = embeddingService.cosineSimilarity(
                        embedding,
                        memory.interaction.embedding
                    );

                    if (similarity > 0.85) { // 85% similarity threshold
                        similar.push({
                            ...memory,
                            similarity
                        });
                    }
                } catch (e) {
                    // Skip invalid embeddings
                    continue;
                }
            }

            return similar.sort((a, b) => b.similarity - a.similarity);

        } catch (error) {
            console.error(chalk.yellow(`[EVOLUTION] ⚠️ Similar memory search failed: ${error.message}`));
            return [];
        }
    }

    /**
     * Benzer memories'i birleştir
     * @private
     */
    async mergeMemories(primary, duplicates) {
        try {
            // Primary'nin importance'ı yükse çık
            const avgImportance = (primary.importance + 
                duplicates.reduce((sum, d) => sum + (d.importance || 0), 0) / duplicates.length) / 2;

            await MemoryStore.updateOne(
                { _id: primary._id },
                {
                    importance: Math.min(avgImportance, 0.99),
                    lastUpdated: new Date()
                }
            );

            // Duplicate'ları deprecated yap
            const duplicateIds = duplicates.map(d => d._id);
            await MemoryStore.updateMany(
                { _id: { $in: duplicateIds } },
                { status: 'deprecated', lastUpdated: new Date() }
            );

            console.log(chalk.cyan(`[EVOLUTION] 🔗 Merged ${duplicates.length} similar memories`));

        } catch (error) {
            console.error(chalk.red(`[EVOLUTION] ❌ Merge failed: ${error.message}`));
        }
    }

    /**
     * Guild'i aktif listesine ekle
     */
    registerGuild(guildId) {
        this.activeGuilds.add(guildId);
    }

    /**
     * Learning stats'ı getir
     */
    async getStats(guildId) {
        try {
            const { LearningStats } = require('../models/GuildMemory');
            
            const stats = await LearningStats.findOne({ guildId });
            
            if (!stats) {
                return {
                    totalInteractionsProcessed: 0,
                    totalMemoriesStored: 0,
                    totalDocumentsIngested: 0,
                    averageImportanceScore: 0
                };
            }

            return {
                totalInteractionsProcessed: stats.totalInteractionsProcessed,
                totalMemoriesStored: stats.totalMemoriesStored,
                totalDocumentsIngested: stats.totalDocumentsIngested,
                averageImportanceScore: stats.averageImportanceScore,
                lastLearningTime: stats.lastLearningTime,
                topicsLearned: stats.topicsLearned || [],
                frequentUsers: stats.frequentUsers || []
            };

        } catch (error) {
            console.error(chalk.red(`[EVOLUTION] ❌ Failed to get stats: ${error.message}`));
            return null;
        }
    }

    /**
     * System status'u getir
     */
    getStatus() {
        return {
            initialized: this.tasksInitialized,
            activeGuilds: this.activeGuilds.size,
            learningInterval: '6 hours',
            cleanupInterval: '12 hours',
            maxRetentionDays: this.MAX_MEMORY_RETENTION_DAYS,
            minImportanceForPermanent: this.MIN_IMPORTANCE_FOR_PERMANENT
        };
    }
}

// Singleton instance
const selfEvolution = new SelfEvolution();

module.exports = selfEvolution;
