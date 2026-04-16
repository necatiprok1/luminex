const fs = require('fs');
const pdfParse = require('pdf-parse');
const chalk = require('chalk');
const embeddingService = require('./embedding-service');
const { KnowledgeBase } = require('../models/GuildMemory');

class KnowledgeManager {
    constructor() {
        this.MAX_CHUNK_SIZE = 2000;
    }

    /**
     * PDF dosyasını işle ve veritabanına kaydet
     */
    async ingestPDF(guildId, filePath, metadata = {}) {
        try {
            console.log(chalk.blue(`[KNOWLEDGE] 📖 PDF işleniyor: ${filePath}`));
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            
            return await this.ingestText(guildId, data.text, {
                ...metadata,
                fileName: metadata.fileName || filePath.split('/').pop(),
                source: 'pdf',
                pages: data.numpages
            });
        } catch (error) {
            console.error(chalk.red(`[KNOWLEDGE] ❌ PDF ingestion error: ${error.message}`));
            throw error;
        }
    }

    /**
     * Ham metni işle, chunkla ve kaydet
     */
    async ingestText(guildId, text, metadata = {}) {
        if (!text || text.length < 50) return { success: false, reason: 'Metin çok kısa.' };

        try {
            const chunks = this.splitIntoChunks(text);
            console.log(chalk.cyan(`[KNOWLEDGE] 🧩 ${chunks.length} parçaya bölündü.`));

            const embedResults = await embeddingService.embedBatch(chunks);
            
            let savedCount = 0;
            for (let i = 0; i < embedResults.length; i++) {
                const res = embedResults[i];
                if (res.error) continue;

                const doc = new KnowledgeBase({
                    guildId,
                    title: `${metadata.fileName || 'Metin'} - Bölüm ${i + 1}`,
                    content: res.text,
                    embedding: res.embedding,
                    source: metadata.source || 'text',
                    sourceUrl: metadata.sourceUrl,
                    chunkIndex: i,
                    metadata: {
                        ...metadata,
                        importedAt: new Date()
                    }
                });

                await doc.save();
                savedCount++;
            }

            return { success: true, chunksSaved: savedCount, totalChunks: chunks.length };
        } catch (error) {
            console.error(chalk.red(`[KNOWLEDGE] ❌ Ingestion error: ${error.message}`));
            throw error;
        }
    }

    /**
     * Metni anlamlı parçalara böl (Smart chunking)
     */
    splitIntoChunks(text, size = this.MAX_CHUNK_SIZE) {
        const chunks = [];
        const sentences = text.split(/(?<=[.!?])\s+/);
        let current = '';

        for (const sentence of sentences) {
            if ((current + sentence).length > size && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current += (current ? ' ' : '') + sentence;
            }
        }
        if (current) chunks.push(current.trim());

        return chunks.filter(c => c.length > 50);
    }
}

module.exports = new KnowledgeManager();
