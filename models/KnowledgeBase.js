const mongoose = require('mongoose');

// Knowledge Base Schema for storing PDF content and learning data
const knowledgeBaseSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['discord', 'general', 'server_rules', 'custom', 'system'],
        default: 'general',
        index: true
    },
    source: { type: String, default: 'system' }, // PDF file path, user input, etc.
    embedding: [Number], // Vector embedding for semantic search
    chunkIndex: { type: Number, default: 0 }, // For chunked documents
    totalChunks: { type: Number, default: 1 },
    tags: [{ type: String, index: true }],
    confidence: { type: Number, default: 1.0, min: 0, max: 1 },
    lastAccessed: { type: Date, default: Date.now },
    accessCount: { type: Number, default: 0 },
    metadata: {
        originalFileName: String,
        fileSize: Number,
        processedAt: { type: Date, default: Date.now },
        processingVersion: { type: String, default: '1.0' }
    }
}, {
    timestamps: true,
    index: { guildId: 1, category: 1, tags: 1 }
});

// Compound indexes for performance
knowledgeBaseSchema.index({ guildId: 1, category: 1, 'metadata.processedAt': -1 });
knowledgeBaseSchema.index({ tags: 1, confidence: -1 });
// Note: Vector search index should be created manually on MongoDB Atlas if needed
// knowledgeBaseSchema.index({ guildId: 1, embedding: 'vector' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
