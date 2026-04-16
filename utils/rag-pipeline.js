/**
 * 🔍 RAG Pipeline - Retrieval Augmented Generation
 * Çok ve metin chunklama, ranker, ve prompt injection
 * Context window optimization for Gemma3:4b
 */

const chalk = require('chalk');
const embeddingService = require('./embedding-service');

// MongoDB models
const { KnowledgeBase, MemoryStore } = require('../models/GuildMemory');

class RAGPipeline {
    constructor() {
        this.MAX_CONTEXT_CHUNKS = 3; // Gemma3:4b context window için
        this.MIN_RELEVANCE_SCORE = 0.3; // Alt eşik değer
        this.MAX_CHUNK_LENGTH = 2000; // Character limit per chunk
    }

    /**
     * Hafızadan ve bilgi tabanından ilgili bağlam retrieve et
     * @param {string} guildId - Guild ID
     * @param {string} query - Kullanıcı sorgusu
     * @returns {Promise<Object>} - Ranked context chunks
     */
    async retrieveContext(guildId, query) {
        if (!guildId || !query) {
            throw new Error('guildId and query are required');
        }

        try {
            // Try embedding-based search first
            let queryEmbedding = null;
            try {
                queryEmbedding = await embeddingService.embedText(query);
            } catch (embedError) {
                console.warn(chalk.yellow(`[RAG] ⚠️ Embedding failed, falling back to text search: ${embedError.message}`));
                queryEmbedding = null;
            }

            // If embedding failed, use text-based search
            if (!queryEmbedding) {
                return this.retrieveContextText(guildId, query);
            }

            // Hafızadan ve bilgi tabanından al
            const [memories, documents] = await Promise.all([
                this.searchMemory(guildId, queryEmbedding),
                this.searchDocuments(guildId, queryEmbedding)
            ]);

            // Birleştir ve rankla
            const combinedResults = [
                ...memories.map(m => ({...m, source: 'memory'})),
                ...documents.map(d => ({...d, source: 'document'}))
            ];

            // Relevance score'a göre sırala
            const rankedResults = combinedResults
                .filter(r => r.relevanceScore >= this.MIN_RELEVANCE_SCORE)
                .sort((a, b) => b.relevanceScore - a.relevanceScore);

            // Top-K seç (context window optimization)
            const selectedChunks = this.rankAndSelectChunks(rankedResults);

            console.log(chalk.blue(`[RAG] 🔍 Retrieved ${selectedChunks.length} chunks for context (${rankedResults.length} candidates)`));

            return {
                success: true,
                chunks: selectedChunks,
                totalCandidates: rankedResults.length,
                selectedCount: selectedChunks.length,
                query: query.substring(0, 100)
            };

        } catch (error) {
            console.error(chalk.red(`[RAG] ❌ Context retrieval failed: ${error.message}`));
            return {
                success: false,
                chunks: [],
                error: error.message
            };
        }
    }

    /**
     * Text-based context retrieval (Embedding olmadan)
     * @private
     */
    async retrieveContextText(guildId, query) {
        try {
            const queryLower = query.toLowerCase();
            
            // Keyword-based search
            const memories = await MemoryStore.find({
                guildId,
                status: 'active',
                $or: [
                    { 'interaction.content': { $regex: queryLower, $options: 'i' } },
                    { 'interaction.type': { $regex: queryLower, $options: 'i' } }
                ]
            })
            .sort({ importance: -1 })
            .limit(5)
            .lean()
            .catch(() => []);

            const documents = await KnowledgeBase.find({
                guildId,
                $or: [
                    { content: { $regex: queryLower, $options: 'i' } },
                    { title: { $regex: queryLower, $options: 'i' } }
                ]
            })
            .sort({ accessCount: -1 })
            .limit(5)
            .lean()
            .catch(() => []);

            const selectedChunks = [
                ...memories.map(m => ({
                    content: m.interaction?.content || m.content,
                    source: 'memory',
                    relevanceScore: 0.7 + (m.importance || 0) / 100
                })),
                ...documents.map(d => ({
                    content: d.content,
                    title: d.title,
                    source: 'document',
                    relevanceScore: 0.6 + (d.accessCount / 1000)
                }))
            ].slice(0, this.MAX_CONTEXT_CHUNKS);

            console.log(chalk.yellow(`[RAG] 🔤 Text search: ${selectedChunks.length} chunks bulundu (Embedding olmadan)`));

            return {
                success: true,
                chunks: selectedChunks,
                totalCandidates: selectedChunks.length,
                selectedCount: selectedChunks.length,
                query: query.substring(0, 100),
                method: 'text-based'
            };
        } catch (error) {
            console.warn(chalk.yellow(`[RAG] ⚠️ Text search failed: ${error.message}`));
            return {
                success: false,
                chunks: [],
                error: error.message
            };
        }
    }

    /**
     * MemoryStore'dan ilgili bilgiler bul
     * @private
     */
    async searchMemory(guildId, queryEmbedding) {
        try {
            // Vector search (Şu an simple semantic matching - MongoDB Atlas Search gerekebilir)
            const memories = await MemoryStore.find({
                guildId: guildId,
                status: 'active',
                'interaction.embedding': { $exists: true }
            })
            .sort({ importance: -1 })
            .limit(10)  // Top-10 adaydan başla
            .lean();

            // Similarity score hesapla
            const scored = memories
                .map(m => {
                    const similarity = embeddingService.cosineSimilarity(
                        queryEmbedding,
                        m.interaction.embedding
                    );
                    return {
                        content: m.interaction.content,
                        type: m.interaction.type,
                        importance: m.importance || 0,
                        relevanceScore: similarity * 0.9 + (m.importance || 0) * 0.1, // Weighted score
                        source_id: m._id.toString(),
                        userId: m.userId,
                        timestamp: m.createdAt
                    };
                })
                .filter(s => s.relevanceScore > 0);

            return scored;

        } catch (error) {
            console.error(chalk.yellow(`[RAG] ⚠️ Memory search failed: ${error.message}`));
            return [];
        }
    }

    /**
     * KnowledgeBase'de belge ara
     * @private
     */
    async searchDocuments(guildId, queryEmbedding) {
        try {
            // Vector search (MongoDB Atlas Search için)
            const documents = await KnowledgeBase.find({
                guildId: guildId
            })
            .sort({ accessCount: -1 })
            .limit(10)  // Top-10 adaydan başla
            .lean();

            // Similarity score hesapla
            const scored = documents
                .map(doc => {
                    const similarity = embeddingService.cosineSimilarity(
                        queryEmbedding,
                        doc.embedding
                    );
                    return {
                        content: doc.content,
                        title: doc.title,
                        source: doc.source,
                        relevanceScore: similarity * 0.8 + (doc.accessCount / 100) * 0.2, // Weighted by popularity
                        source_id: doc._id.toString(),
                        metadata: doc.metadata,
                        sourceUrl: doc.sourceUrl,
                        accessCount: doc.accessCount
                    };
                })
                .filter(s => s.relevanceScore > 0);

            return scored;

        } catch (error) {
            console.error(chalk.yellow(`[RAG] ⚠️ Document search failed: ${error.message}`));
            return [];
        }
    }

    /**
     * RANKER: Top-K chunks seç (Context window optimization)
     * Gemma3:4b için max 3 chunk
     * @private
     */
    rankAndSelectChunks(rankedResults) {
        if (!Array.isArray(rankedResults)) {
            return [];
        }

        // Top-3 seç (context window management)
        return rankedResults
            .slice(0, this.MAX_CONTEXT_CHUNKS)
            .map((chunk, index) => ({
                ...chunk,
                rank: index + 1,
                // Chunk'ı kısalt eğer çok uzunsa
                content: chunk.content.length > this.MAX_CHUNK_LENGTH
                    ? chunk.content.substring(0, this.MAX_CHUNK_LENGTH) + '...'
                    : chunk.content
            }));
    }

    /**
     * Seçilmiş chunks'ı LLM prompt'ına enjekte etmek için formatla
     * @param {Array} chunks - Selected chunks from rankAndSelectChunks
     * @param {string} sourceType - 'combined', 'memory_only', 'docs_only'
     * @returns {string} - Formatted context for prompt
     */
    formatContextForPrompt(chunks, sourceType = 'combined') {
        if (!chunks || chunks.length === 0) {
            return '';
        }

        let contextStr = '';

        if (sourceType === 'combined' || sourceType === 'docs_only') {
            const docChunks = chunks.filter(c => c.source === 'document');
            if (docChunks.length > 0) {
                contextStr += '📚 **BILGI TABANINDA BULUNMUŞ DÖKÜMANTER:**\n';
                docChunks.forEach((chunk, idx) => {
                    contextStr += `\n[${idx + 1}] ${chunk.title || 'Untitled'}\n`;
                    contextStr += `Kaynak: ${chunk.sourceUrl || chunk.source}\n`;
                    contextStr += `---\n${chunk.content}\n`;
                });
                contextStr += '\n';
            }
        }

        if (sourceType === 'combined' || sourceType === 'memory_only') {
            const memoryChunks = chunks.filter(c => c.source === 'memory');
            if (memoryChunks.length > 0) {
                contextStr += '🧠 **HAFIZADAN ÇIKARILAN BİLGİLER:**\n';
                memoryChunks.forEach((chunk, idx) => {
                    contextStr += `\n[${idx + 1}] ${chunk.type.toUpperCase()}\n`;
                    contextStr += `---\n${chunk.content}\n`;
                });
                contextStr += '\n';
            }
        }

        return contextStr;
    }

    /**
     * Güvenilirlik metriklerini hesapla
     * @param {Array} chunks - Selected chunks
     * @returns {Object} - Confidence metrics
     */
    calculateConfidence(chunks) {
        if (!chunks || chunks.length === 0) {
            return {
                hasContext: false,
                averageRelevance: 0,
                confidence: 'low',
                shouldSearchWeb: true
            };
        }

        const avgRelevance = chunks.reduce((sum, c) => sum + (c.relevanceScore || 0), 0) / chunks.length;
        
        let confidence = 'low';
        let shouldSearchWeb = true;

        if (avgRelevance > 0.7) {
            confidence = 'high';
            shouldSearchWeb = false;
        } else if (avgRelevance > 0.5) {
            confidence = 'medium';
            shouldSearchWeb = false;
        }

        return {
            hasContext: true,
            averageRelevance: Math.round(avgRelevance * 100) / 100,
            confidence,
            shouldSearchWeb,
            chunkCount: chunks.length
        };
    }

    /**
     * Chunk'ı MemoryStore'a aktualleştir
     * (Relevance feedback için - kullanıcı feedback'i ışığında)
     */
    async updateChunkRelevance(chunkId, newRelevanceScore) {
        try {
            if (chunkId.startsWith('memory_')) {
                const memoryId = chunkId.replace('memory_', '');
                await MemoryStore.updateOne(
                    { _id: memoryId },
                    { lastUpdated: new Date() }
                );
            } else if (chunkId.startsWith('doc_')) {
                const docId = chunkId.replace('doc_', '');
                await KnowledgeBase.updateOne(
                    { _id: docId },
                    { 
                        relevanceScore: newRelevanceScore,
                        lastAccessedAt: new Date(),
                        $inc: { accessCount: 1 }
                    }
                );
            }
        } catch (error) {
            console.error(chalk.red(`[RAG] ❌ Failed to update chunk relevance: ${error.message}`));
        }
    }

    /**
     * RAG pipeline'ı test et
     */
    async test(guildId) {
        console.log(chalk.blue('[RAG] 🧪 Running pipeline test...'));
        
        const testQuery = 'Merhaba, bana yardımcı ol';
        
        const result = await this.retrieveContext(guildId, testQuery);
        
        if (result.success) {
            console.log(chalk.green('[RAG] ✅ Test completed successfully'));
            console.log(chalk.cyan(`    Query: "${testQuery}"`));
            console.log(chalk.cyan(`    Retrieved chunks: ${result.selectedCount}`));
            console.log(chalk.cyan(`    Total candidates: ${result.totalCandidates}`));
        } else {
            console.log(chalk.yellow('[RAG] ⚠️ Test completed with no results (normal if empty database)'));
        }

        return result;
    }
}

// Singleton instance
const ragPipeline = new RAGPipeline();

module.exports = ragPipeline;
