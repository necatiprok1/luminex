#!/usr/bin/env node

/**
 * 📚 Batch PDF Import Script
 * ./knowledge_base_pdfs/ klasöründeki tüm PDF'leri toplu içe aktarır
 * Usage: npm run import-knowledge
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const chalk = require('chalk');
require('dotenv').config();
const mongoose = require('mongoose');

// Models
const knowledgeManager = require('../utils/knowledge-manager');

const KNOWLEDGE_PATH = path.join(__dirname, '..', 'knowledge_base_pdfs');

class BatchImporter {
    constructor() {
        this.guildId = process.env.IMPORT_GUILD_ID || 'batch-import';
        this.totalFiles = 0;
        this.successFiles = 0;
        this.failedFiles = 0;
        this.totalChunksProcessed = 0;
        this.startTime = Date.now();
    }

    async run() {
        console.log(chalk.blue.bold('\n═══════════════════════════════════════'));
        console.log(chalk.blue.bold('📚 BATCH PDF IMPORT SYSTEM (v2)'));
        console.log(chalk.blue.bold('═══════════════════════════════════════\n'));

        try {
            await this.connectDB();
            const embeddingReady = await embeddingService.initialize();
            if (!embeddingReady) throw new Error('Embedding service initialization failed');

            if (!fs.existsSync(KNOWLEDGE_PATH)) {
                fs.mkdirSync(KNOWLEDGE_PATH, { recursive: true });
                console.log(chalk.green('[IMPORT] Knowledge directory created.'));
                process.exit(0);
            }

            const files = fs.readdirSync(KNOWLEDGE_PATH)
                .filter(file => file.endsWith('.pdf') || file.endsWith('.txt') || file.endsWith('.md'))
                .map(file => path.join(KNOWLEDGE_PATH, file));

            if (files.length === 0) {
                console.log(chalk.yellow('[IMPORT] ⚠️ No supported files (.pdf, .txt, .md) found.'));
                process.exit(0);
            }

            console.log(chalk.cyan(`[IMPORT] Found ${files.length} files\n`));
            this.totalFiles = files.length;

            for (const filePath of files) {
                try {
                    let result;
                    if (filePath.endsWith('.pdf')) {
                        result = await knowledgeManager.ingestPDF(this.guildId, filePath);
                    } else {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        result = await knowledgeManager.ingestText(this.guildId, content, {
                            fileName: path.basename(filePath),
                            source: 'text'
                        });
                    }

                    if (result.success) {
                        this.successFiles++;
                        this.totalChunksProcessed += result.chunksSaved;
                    } else {
                        this.failedFiles++;
                    }
                } catch (err) {
                    console.error(chalk.red(`[IMPORT] ❌ Error processing ${path.basename(filePath)}: ${err.message}`));
                    this.failedFiles++;
                }
            }

            await this.printSummary();
            process.exit(0);
        } catch (error) {
            console.error(chalk.red(`[IMPORT] ❌ Fatal error: ${error.message}`));
            process.exit(1);
        }
    }

    /**
     * İçe aktarma özetini yazdır
     * @private
     */
    async printSummary() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

        console.log(chalk.blue.bold('\n═══════════════════════════════════════'));
        console.log(chalk.blue.bold('📊 IMPORT SUMMARY'));
        console.log(chalk.blue.bold('═══════════════════════════════════════\n'));

        console.log(chalk.cyan(`Duration: ${duration}s`));
        console.log(chalk.cyan(`Files processed: ${this.totalFiles}`));
        console.log(chalk.green(`  ✅ Success: ${this.successFiles}`));
        console.log(chalk.red(`  ❌ Failed: ${this.failedFiles}`));
        console.log(chalk.cyan(`Total chunks saved: ${this.totalChunksProcessed}`));
        console.log(chalk.cyan(`Guild ID: ${this.guildId}`));

        // Learning stats'ı güncelle
        try {
            await LearningStats.updateOne(
                { guildId: this.guildId },
                {
                    $inc: { totalDocumentsIngested: this.totalChunksProcessed },
                    lastLearningTime: new Date()
                },
                { upsert: true }
            );
        } catch (error) {
            console.error(chalk.yellow(`[IMPORT] ⚠️ Failed to update learning stats: ${error.message}`));
        }

        console.log(chalk.blue.bold('\n═══════════════════════════════════════\n'));

        if (this.failedFiles > 0) {
            console.warn(chalk.yellow(`⚠️ ${this.failedFiles} files failed. Check logs above.`));
        } else {
            console.log(chalk.green('✅ All files imported successfully!'));
        }
    }
}

// Çalıştır
const importer = new BatchImporter();
importer.run().catch(error => {
    console.error(chalk.red(`\n❌ FATAL: ${error.message}`));
    process.exit(1);
});
