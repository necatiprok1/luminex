/**
 * 📄 PDF Processing Service
 * Automatically processes PDF files and extracts knowledge for the AI system
 */

const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const chalk = require('chalk');
const KnowledgeBase = require('../models/KnowledgeBase');
const embeddingService = require('./embedding-service');

class PDFProcessor {
    constructor() {
        this.knowledgeBaseDir = path.join(__dirname, '../knowledge_base_pdfs');
        this.processedFiles = new Set();
        this.chunkSize = 1000; // Characters per chunk
        this.chunkOverlap = 200; // Overlap between chunks
        this.supportedFormats = ['.pdf', '.md', '.txt'];
    }

    /**
     * Initialize the PDF processor
     */
    async initialize() {
        console.log(chalk.blue('[PDF_PROCESSOR] 🚀 Initializing PDF processing system...'));
        
        try {
            // Ensure knowledge base directory exists
            await fs.mkdir(this.knowledgeBaseDir, { recursive: true });
            
            // Process existing files
            await this.processAllFiles();
            
            // Set up file watcher for new files
            this.setupFileWatcher();
            
            console.log(chalk.green('[PDF_PROCESSOR] ✅ PDF processor initialized'));
            return true;
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Initialization failed:'), error.message);
            return false;
        }
    }

    /**
     * Process all files in the knowledge base directory
     */
    async processAllFiles() {
        try {
            const files = await fs.readdir(this.knowledgeBaseDir);
            let processed = 0;
            
            for (const file of files) {
                const filePath = path.join(this.knowledgeBaseDir, file);
                const stat = await fs.stat(filePath);
                
                if (stat.isFile() && this.isSupportedFile(file)) {
                    try {
                        await this.processFile(filePath);
                        processed++;
                    } catch (error) {
                        console.error(chalk.red(`[PDF_PROCESSOR] ❌ Error processing ${file}:`), error.message);
                    }
                }
            }
            
            console.log(chalk.green(`[PDF_PROCESSOR] ✅ Processed ${processed} files`));
            return processed;
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Error processing files:'), error.message);
            return 0;
        }
    }

    /**
     * Process a single file
     */
    async processFile(filePath) {
        const fileName = path.basename(filePath);
        const fileExt = path.extname(fileName).toLowerCase();
        
        console.log(chalk.blue(`[PDF_PROCESSOR] 📄 Processing: ${fileName}`));
        
        // Check if already processed
        const existingKnowledge = await KnowledgeBase.findOne({
            guildId: 'global',
            'metadata.originalFileName': fileName
        });
        
        if (existingKnowledge) {
            console.log(chalk.yellow(`[PDF_PROCESSOR] ⚠️ Already processed: ${fileName}`));
            return;
        }

        let content;
        
        try {
            // Extract content based on file type
            switch (fileExt) {
                case '.pdf':
                    content = await this.extractPDFContent(filePath);
                    break;
                case '.md':
                    content = await this.extractMarkdownContent(filePath);
                    break;
                case '.txt':
                    content = await this.extractTextContent(filePath);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileExt}`);
            }

            // Process and store content
            await this.storeKnowledge(fileName, content, filePath);
            
            this.processedFiles.add(fileName);
            console.log(chalk.green(`[PDF_PROCESSOR] ✅ Successfully processed: ${fileName}`));
            
        } catch (error) {
            console.error(chalk.red(`[PDF_PROCESSOR] ❌ Error processing ${fileName}:`), error.message);
            throw error;
        }
    }

    /**
     * Extract content from PDF file
     */
    async extractPDFContent(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            
            return {
                text: data.text,
                info: data.info,
                metadata: data.metadata,
                pageCount: data.numpages
            };
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ PDF extraction error:'), error.message);
            throw error;
        }
    }

    /**
     * Extract content from Markdown file
     */
    async extractMarkdownContent(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Parse markdown structure
            const lines = content.split('\n');
            const sections = [];
            let currentSection = { title: 'Başlangıç', content: [] };
            
            for (const line of lines) {
                if (line.startsWith('#')) {
                    // New section
                    if (currentSection.content.length > 0) {
                        sections.push(currentSection);
                    }
                    currentSection = {
                        title: line.replace(/^#+\s*/, '').trim(),
                        content: []
                    };
                } else {
                    currentSection.content.push(line);
                }
            }
            
            if (currentSection.content.length > 0) {
                sections.push(currentSection);
            }
            
            return {
                text: content,
                sections: sections,
                type: 'markdown'
            };
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Markdown extraction error:'), error.message);
            throw error;
        }
    }

    /**
     * Extract content from text file
     */
    async extractTextContent(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            return {
                text: content,
                type: 'text'
            };
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Text extraction error:'), error.message);
            throw error;
        }
    }

    /**
     * Store processed knowledge in database
     */
    async storeKnowledge(fileName, content, filePath) {
        try {
            const chunks = this.chunkContent(content.text);
            const category = this.determineCategory(fileName, content);
            const tags = this.extractTags(fileName, content);
            
            const knowledgeDocs = [];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                // Generate embedding for the chunk
                let embedding = null;
                try {
                    if (embeddingService && embeddingService.initialized) {
                        embedding = await embeddingService.embedText(chunk);
                    }
                } catch (error) {
                    console.warn(chalk.yellow('[PDF_PROCESSOR] ⚠️ Embedding generation failed:'), error.message);
                }
                
                const knowledgeDoc = new KnowledgeBase({
                    guildId: 'global',
                    title: this.generateChunkTitle(fileName, i, chunks.length, content),
                    content: chunk,
                    category: category,
                    source: filePath,
                    embedding: embedding,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    tags: tags,
                    confidence: 0.9,
                    metadata: {
                        originalFileName: fileName,
                        fileSize: (await fs.stat(filePath)).size,
                        processedAt: new Date(),
                        processingVersion: '1.0'
                    }
                });
                
                knowledgeDocs.push(knowledgeDoc);
            }
            
            // Save all chunks
            if (knowledgeDocs.length > 0) {
                await KnowledgeBase.insertMany(knowledgeDocs);
                console.log(chalk.green(`[PDF_PROCESSOR] ✅ Stored ${knowledgeDocs.length} knowledge chunks for ${fileName}`));
            }
            
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Error storing knowledge:'), error.message);
            throw error;
        }
    }

    /**
     * Chunk content into smaller pieces
     */
    chunkContent(text) {
        const chunks = [];
        let currentChunk = '';
        
        const sentences = text.split(/[.!?]+/);
        
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            
            if (!trimmedSentence) continue;
            
            if (currentChunk.length + trimmedSentence.length > this.chunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    // Start new chunk with overlap
                    const words = currentChunk.split(' ');
                    const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 10));
                    currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
                } else {
                    // Sentence itself is too long, split it
                    chunks.push(trimmedSentence);
                    currentChunk = '';
                }
            } else {
                currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
    }

    /**
     * Determine category based on filename and content
     */
    determineCategory(fileName, content) {
        const fileNameLower = fileName.toLowerCase();
        const contentLower = content.text.toLowerCase();
        
        if (fileNameLower.includes('discord') || contentLower.includes('discord')) {
            return 'discord';
        } else if (fileNameLower.includes('rule') || fileNameLower.includes('kurallar') || contentLower.includes('kurallar')) {
            return 'server_rules';
        } else if (fileNameLower.includes('system') || fileNameLower.includes('prompt')) {
            return 'system';
        } else if (fileNameLower.includes('ataturk') || contentLower.includes('ataturk')) {
            return 'general';
        } else {
            return 'general';
        }
    }

    /**
     * Extract tags from filename and content
     */
    extractTags(fileName, content) {
        const tags = [];
        const fileNameLower = fileName.toLowerCase();
        const contentLower = content.text.toLowerCase();
        
        // Extract from filename
        const fileNameTags = fileNameLower
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        tags.push(...fileNameTags);
        
        // Extract important keywords from content
        const keywords = ['ataturk', 'türkiye', 'discord', 'bot', 'yapay zeka', 'ai', 'sistem', 'kurallar'];
        
        for (const keyword of keywords) {
            if (contentLower.includes(keyword)) {
                tags.push(keyword);
            }
        }
        
        return [...new Set(tags)]; // Remove duplicates
    }

    /**
     * Generate title for chunk
     */
    generateChunkTitle(fileName, chunkIndex, totalChunks, content) {
        const baseName = path.basename(fileName, path.extname(fileName));
        
        if (totalChunks === 1) {
            return baseName;
        }
        
        // Try to find a meaningful title from content
        const lines = content.text.split('\n').slice(0, 10);
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.startsWith('http')) {
                return `${baseName} - ${trimmed}`;
            }
        }
        
        return `${baseName} - Bölüm ${chunkIndex + 1}/${totalChunks}`;
    }

    /**
     * Check if file is supported
     */
    isSupportedFile(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * Set up file watcher for automatic processing
     */
    setupFileWatcher() {
        try {
            const watcher = require('chokidar').watch(this.knowledgeBaseDir, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                persistent: true
            });
            
            watcher.on('add', async (filePath) => {
                const fileName = path.basename(filePath);
                if (this.isSupportedFile(fileName)) {
                    console.log(chalk.blue(`[PDF_PROCESSOR] 📁 New file detected: ${fileName}`));
                    try {
                        await this.processFile(filePath);
                    } catch (error) {
                        console.error(chalk.red(`[PDF_PROCESSOR] ❌ Error processing new file ${fileName}:`), error.message);
                    }
                }
            });
            
            watcher.on('change', async (filePath) => {
                const fileName = path.basename(filePath);
                if (this.isSupportedFile(fileName)) {
                    console.log(chalk.blue(`[PDF_PROCESSOR] 🔄 File modified: ${fileName}`));
                    try {
                        // Remove existing knowledge
                        await KnowledgeBase.deleteMany({
                            guildId: 'global',
                            'metadata.originalFileName': fileName
                        });
                        
                        // Reprocess file
                        await this.processFile(filePath);
                    } catch (error) {
                        console.error(chalk.red(`[PDF_PROCESSOR] ❌ Error reprocessing file ${fileName}:`), error.message);
                    }
                }
            });
            
            watcher.on('unlink', async (filePath) => {
                const fileName = path.basename(filePath);
                console.log(chalk.blue(`[PDF_PROCESSOR] 🗑️ File deleted: ${fileName}`));
                try {
                    await KnowledgeBase.deleteMany({
                        guildId: 'global',
                        'metadata.originalFileName': fileName
                    });
                } catch (error) {
                    console.error(chalk.red(`[PDF_PROCESSOR] ❌ Error deleting knowledge for ${fileName}:`), error.message);
                }
            });
            
            console.log(chalk.green('[PDF_PROCESSOR] ✅ File watcher initialized'));
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ File watcher setup failed:'), error.message);
        }
    }

    /**
     * Get processing statistics
     */
    async getStats() {
        try {
            const totalKnowledge = await KnowledgeBase.countDocuments({ guildId: 'global' });
            const categories = await KnowledgeBase.distinct('category', { guildId: 'global' });
            
            const stats = {
                totalDocuments: totalKnowledge,
                categories: categories.length,
                processedFiles: this.processedFiles.size,
                supportedFormats: this.supportedFormats
            };
            
            return stats;
        } catch (error) {
            console.error(chalk.red('[PDF_PROCESSOR] ❌ Error getting stats:'), error.message);
            return null;
        }
    }
}

// Create singleton instance
const pdfProcessor = new PDFProcessor();

module.exports = pdfProcessor;
