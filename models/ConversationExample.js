const mongoose = require('mongoose');

// Conversation Examples for AI training and few-shot learning
const conversationExampleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String },
    
    // Conversation context
    context: {
        channelType: { type: String, enum: ['text', 'voice', 'dm'] },
        channelName: String,
        isDM: { type: Boolean, default: false },
        previousMessages: [{ type: String }] // Last few messages for context
    },
    
    // The actual conversation
    userMessage: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 2000
    },
    aiResponse: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 2000
    },
    
    // Classification and metadata
    category: {
        type: String,
        enum: [
            'discord_command', 'general_chat', 'server_management',
            'help_request', 'greeting', 'farewell', 'question_answer',
            'roleplay', 'technical_support', 'moderation', 'entertainment'
        ],
        required: true,
        index: true
    },
    
    intent: { type: String, index: true }, // User's intent classification
    sentiment: { 
        type: String, 
        enum: ['positive', 'neutral', 'negative', 'mixed'],
        default: 'neutral'
    },
    
    // Quality metrics
    quality: {
        rating: { type: Number, min: 1, max: 5, default: 3 }, // Human rating
        helpful: { type: Boolean, default: true },
        accurate: { type: Boolean, default: true },
        appropriate: { type: Boolean, default: true }
    },
    
    // Learning metrics
    metrics: {
        responseTime: Number, // ms
        userSatisfaction: Number, // 1-5 scale
        followUpQuestions: { type: Number, default: 0 },
        wasResolved: { type: Boolean, default: true }
    },
    
    // Usage tracking
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now },
    effectiveness: { type: Number, default: 1.0 }, // How well this example performs
    
    // Metadata
    source: { 
        type: String, 
        enum: ['manual', 'automatic', 'imported', 'generated'],
        default: 'automatic'
    },
    tags: [{ type: String, index: true }],
    language: { type: String, default: 'tr', index: true },
    
    // Active/inactive for training
    active: { type: Boolean, default: true },
    
    // Relationships
    similarExamples: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConversationExample' }]
    
}, {
    timestamps: true,
    index: { guildId: 1, category: 1, active: 1 }
});

// Compound indexes for performance
conversationExampleSchema.index({ guildId: 1, category: 1, 'quality.rating': -1 });
conversationExampleSchema.index({ active: 1, effectiveness: -1 });
conversationExampleSchema.index({ tags: 1, 'metrics.wasResolved': -1 });
conversationExampleSchema.index({ intent: 1, sentiment: 1 });

// Text search index
conversationExampleSchema.index({
    userMessage: 'text',
    aiResponse: 'text',
    tags: 'text'
}, {
    weights: {
        userMessage: 10,
        aiResponse: 5,
        tags: 3
    },
    name: 'conversation_text_search'
});

module.exports = mongoose.model('ConversationExample', conversationExampleSchema);
