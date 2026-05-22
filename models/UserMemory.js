const mongoose = require('mongoose');

/**
 * 🧠 Kullanıcı Bazlı AI Hafıza Modeli
 * Her kullanıcının AI ile olan konuşma geçmişi
 */

const userMemorySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, default: '' },

    // Konuşma geçmişi (son N mesaj)
    conversations: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    }],

    // Kullanıcı profili (AI'ın öğrendiği bilgiler)
    profile: {
        interests: [String],       // İlgi alanları
        personality: String,       // Kişilik notu
        language: { type: String, default: 'tr' },
        customInstructions: String, // Kullanıcının özel talimatları
    },

    // İstatistikler
    stats: {
        totalMessages: { type: Number, default: 0 },
        lastInteraction: { type: Date, default: Date.now },
        favoriteTopics: { type: Map, of: Number, default: {} },
    },

    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Composite index
userMemorySchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Konuşma ekleme metodu (maks 50 mesaj tut)
userMemorySchema.methods.addMessage = function(role, content) {
    this.conversations.push({ role, content, timestamp: new Date() });
    if (this.conversations.length > 50) {
        this.conversations = this.conversations.slice(-50);
    }
    this.stats.totalMessages++;
    this.stats.lastInteraction = new Date();
    return this.save();
};

// Son N konuşmayı getir
userMemorySchema.methods.getRecentConversations = function(count = 10) {
    return this.conversations.slice(-count);
};

// Konuşma geçmişini temizle
userMemorySchema.methods.clearConversations = function() {
    this.conversations = [];
    return this.save();
};

module.exports = mongoose.models.UserMemory || mongoose.model('UserMemory', userMemorySchema);
