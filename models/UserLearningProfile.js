const mongoose = require('mongoose');

// User Learning Profile for personalized AI interactions
const userLearningProfileSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String },
    
    // Communication preferences
    preferences: {
        language: { type: String, default: 'tr' },
        formality: { 
            type: String, 
            enum: ['casual', 'formal', 'mixed'],
            default: 'casual'
        },
        responseLength: {
            type: String,
            enum: ['short', 'medium', 'long', 'adaptive'],
            default: 'adaptive'
        },
        humorLevel: { type: Number, min: 0, max: 10, default: 5 },
        technicalLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'intermediate'
        },
        timezone: { type: String, default: 'Europe/Istanbul' }
    },
    
    // Interaction patterns
    patterns: {
        activeHours: [{
            hour: { type: Number, min: 0, max: 23 },
            frequency: { type: Number, default: 0 }
        }],
        preferredTopics: [{ type: String }],
        avoidedTopics: [{ type: String }],
        commonCommands: [{ type: String }],
        responseStyle: {
            emojiUsage: { type: Number, min: 0, max: 10, default: 5 },
            slangUsage: { type: Number, min: 0, max: 10, default: 3 },
            questionFrequency: { type: Number, min: 0, max: 10, default: 5 }
        }
    },
    
    // Learning history
    history: {
        totalInteractions: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        satisfactionScore: { type: Number, default: 0 },
        lastInteraction: { type: Date, default: Date.now },
        streakDays: { type: Number, default: 0 },
        favoriteFeatures: [{ type: String }]
    },
    
    // Feedback data
    feedback: {
        positiveReactions: { type: Number, default: 0 },
        negativeReactions: { type: Number, default: 0 },
        helpfulVotes: { type: Number, default: 0 },
        correctionCount: { type: Number, default: 0 },
        suggestions: [{ type: String }]
    },
    
    // Personalization data
    personalization: {
        nicknames: [String],
        insideJokes: [String],
        personalContext: {
            hobbies: [String],
            interests: [String],
            profession: String,
            roleInServer: String
        },
        memoryTriggers: [{
            keyword: String,
            response: String,
            context: String
        }]
    },
    
    // Privacy settings
    privacy: {
        allowLearning: { type: Boolean, default: true },
        allowPersonalization: { type: Boolean, default: true },
        dataRetention: { 
            type: String, 
            enum: ['30days', '90days', '1year', 'permanent'],
            default: '90days'
        },
        anonymizeData: { type: Boolean, default: false }
    },
    
    // System flags
    flags: {
        isVIP: { type: Boolean, default: false },
        isModerator: { type: Boolean, default: false },
        isBanned: { type: Boolean, default: false },
        requiresSpecialHandling: { type: Boolean, default: false }
    }
    
}, {
    timestamps: true,
    index: { guildId: 1, userId: 1 }
});

// Compound indexes
userLearningProfileSchema.index({ guildId: 1, 'history.totalInteractions': -1 });
userLearningProfileSchema.index({ userId: 1, 'history.lastInteraction': -1 });
userLearningProfileSchema.index({ guildId: 1, 'flags.isVIP': 1 });

// TTL index for data retention based on privacy settings
userLearningProfileSchema.index({ updatedAt: 1 }, { 
    expireAfterSeconds: 0, // Will be set dynamically based on privacy.dataRetention
    partialFilterExpression: { 'privacy.dataRetention': { $ne: 'permanent' } }
});

module.exports = mongoose.model('UserLearningProfile', userLearningProfileSchema);
