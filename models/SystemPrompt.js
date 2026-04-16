const mongoose = require('mongoose');

const systemPromptSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    
    // Global vs Server-specific
    scope: {
        type: String,
        enum: ['global', 'server'],
        default: 'server',
        index: true
    },
    
    // Base prompt content
    basePrompt: { type: String, required: true },
    
    // Enhanced prompt components
    components: {
        identity: String, // Bot identity and personality
        purpose: String,  // Main purpose and goals
        rules: [String],  // Behavioral rules
        constraints: [String], // What not to do
        guidelines: [String], // How to respond
        examples: [{
            user: { type: String },
            ai: { type: String },
            context: { type: String },
            category: { type: String }
        }]
    },
    
    // Dynamic elements
    moodSystem: {
        currentMood: { type: String, default: 'Mutlu' },
        availableMoods: [{ type: String }],
        moodTriggers: [{
            mood: String,
            keywords: [String],
            contexts: [String]
        }]
    },
    
    // Customization
    customInstructions: { type: String },
    serverRules: { type: String },
    channelSpecific: [{
        channelId: String,
        channelName: String,
        customPrompt: String,
        isActive: { type: Boolean, default: true }
    }],
    
    // Response configuration
    responseConfig: {
        maxLength: { type: Number, default: 2000 },
        minLength: { type: Number, default: 10 },
        useEmojis: { type: Boolean, default: true },
        formality: { 
            type: String, 
            enum: ['casual', 'formal', 'mixed'],
            default: 'casual'
        },
        language: { type: String, default: 'tr' },
        responseStyle: {
            helpful: { type: Boolean, default: true },
            friendly: { type: Boolean, default: true },
            professional: { type: Boolean, default: false },
            humorous: { type: Boolean, default: true }
        }
    },
    
    // Learning and adaptation
    learningConfig: {
        enableLearning: { type: Boolean, default: true },
        adaptFromConversations: { type: Boolean, default: true },
        feedbackIntegration: { type: Boolean, default: true },
        personalizationLevel: { 
            type: Number, 
            min: 0, 
            max: 10, 
            default: 5 
        }
    },
    
    // Knowledge integration
    knowledgeIntegration: {
        useKnowledgeBase: { type: Boolean, default: true },
        priorityCategories: [{ type: String }],
        fallbackToGeneral: { type: Boolean, default: true },
        confidenceThreshold: { type: Number, default: 0.7 }
    },
    
    // Version control
    version: { type: String, default: '1.0' },
    lastUpdatedBy: { type: String }, // User ID who updated
    updateReason: { type: String },
    
    // Performance metrics
    metrics: {
        usageCount: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        userSatisfaction: { type: Number, default: 0 },
        effectiveness: { type: Number, default: 1.0 }
    },
    
    // Status
    active: { type: Boolean, default: true },
    isTemplate: { type: Boolean, default: false }, // For creating new servers
    
    // Metadata
    tags: [{ type: String, index: true }],
    category: { type: String, default: 'general' }
    
}, { 
    timestamps: true,
    index: { guildId: 1, scope: 1, active: 1 }
});

// Compound indexes
systemPromptSchema.index({ scope: 1, active: 1 });
systemPromptSchema.index({ tags: 1, 'metrics.effectiveness': -1 });
systemPromptSchema.index({ 'components.examples.category': 1 });

module.exports = mongoose.model('SystemPrompt', systemPromptSchema);
