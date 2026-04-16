const mongoose = require('mongoose');
const KnowledgeBase = require('./KnowledgeBase');

// Konuşma Geçmişi Şeması
const conversationSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String },
    userMessage: { type: String },
    aiResponse: { type: String },
    timestamp: { type: Date, default: Date.now, expires: 604800 } // 7 gün sonra otomatik silinir (ttl)
});

// Öğrenilen Bilgiler (Facts) Şeması
const factSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    topic: { type: String, required: true },
    info: { type: String, required: true },
    source: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now }
});

// İstatistikler Şeması
const statSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    statType: { type: String, required: true },
    value: { type: Number, required: true },
    date: { type: Date, default: Date.now, expires: 86400 } // Sadece son 24 saati tut
});

// Geri Bildirim Şeması (Adaptif)
const feedbackSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    type: { type: String, required: true },
    accepted: { type: Boolean, required: true },
    date: { type: Date, default: Date.now }
});

// Kanal Yoğunluk Şeması
const activitySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    channelName: { type: String },
    count: { type: Number, default: 1 },
    hourKey: { type: String, required: true }, // Örn: 2026-3-12_18
    date: { type: Date, default: Date.now, expires: 86400 }
});

// Medya Yoğunluğu Şeması
const mediaSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    count: { type: Number, default: 1 },
    dateKey: { type: String, required: true }, // Örn: 2026-3-12
    date: { type: Date, default: Date.now, expires: 86400 }
});

// Moderasyon Log Şeması
const modLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    action: { type: String, required: true },
    moderatorId: { type: String },
    moderatorTag: { type: String },
    targetId: { type: String },
    targetTag: { type: String },
    reason: { type: String },
    content: { type: String },
    timestamp: { type: Date, default: Date.now, expires: 2592000 } // 30 gün
});

// ══════════════════════════════════════
// 🎓 RAG SYSTEM SCHEMAS
// ══════════════════════════════════════

// KnowledgeBase is now in its own model file - imported to avoid duplication

// Server Cache - Discord sunucu durumunu saklayan şema
const serverCacheSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String },
    ownerId: { type: String },
    memberCount: { type: Number },
    members: [{
        userId: { type: String, required: true },
        username: { type: String },
        discriminator: { type: String },
        roles: [String],
        joinedAt: { type: Date },
        nickname: { type: String }
    }],
    roles: [{
        roleId: { type: String, required: true },
        roleName: { type: String },
        color: { type: String },
        permissions: [String],
        memberCount: { type: Number }
    }],
    channels: [{
        channelId: { type: String, required: true },
        name: { type: String },
        type: { type: String }, // 'text', 'voice', 'category'
        topic: { type: String },
        nsfw: { type: Boolean }
    }],
    serverInfo: {
        description: { type: String },
        language: { type: String, default: 'tr' },
        premiumTier: { type: Number },
        customEmojis: { type: Number }
    },
    lastSync: { type: Date, default: Date.now },
    syncStatus: { type: String, default: 'pending' } // 'pending', 'syncing', 'completed', 'failed'
}, { timestamps: true });

// Index for quick lookups (guildId already has unique: true)
serverCacheSchema.index({ lastSync: 1 });

// Memory Store - Öğrenilen etkileşimleri saklayan şema (Aggressive learning)
const memoryStoreSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String },
    
    // İnsan aktivitesi özeti
    interaction: {
        type: { type: String }, // 'user_fact', 'problem_solution', 'preference', 'server_insight'
        content: { type: String, required: true },
        embedding: [Number] // 768-dimensional vector
    },
    
    // Kalite ölçütleri
    importance: { type: Number, min: 0, max: 1 }, // LLM tarafından hesaplanan önem skoru
    confidence: { type: Number, min: 0, max: 1 }, // Bilginin kesinlik derecesi
    
    // Bağlam
    context: {
        channelId: { type: String },
        channelName: { type: String },
        messageId: { type: String },
        messageContent: { type: String },
        conversationTopic: { type: String }
    },
    
    // Kaynak ve takip
    source: { type: String }, // 'message', 'interaction', 'feedback'
    extractedAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    
    // Hafıza yaşam döngüsü
    status: { type: String, enum: ['active', 'deprecated', 'merged'], default: 'active' },
    ttl: { type: Number, default: 2592000 }, // 30 gün default (saniye cinsinden)
    
    // Referanslı belge
    linkedDocId: { type: String } // KnowledgeBase dokümana bağlı olabilir
}, { timestamps: true });

// TTL index for automatic cleanup (expires after ttl seconds)
memoryStoreSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 gün default
memoryStoreSchema.index({ guildId: 1, userId: 1 });
memoryStoreSchema.index({ 'interaction.embedding': '2dsphere' });
memoryStoreSchema.index({ importance: -1 });

// Learning Stats - Öğrenme metrikleri
const learningStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    
    totalInteractionsProcessed: { type: Number, default: 0 },
    totalMemoriesStored: { type: Number, default: 0 },
    totalDocumentsIngested: { type: Number, default: 0 },
    
    averageImportanceScore: { type: Number, default: 0 },
    lastLearningTime: { type: Date },
    
    // Kültür bilgisi
    topicsLearned: [String],
    frequentUsers: [String],
    
    // Periyodik istatistikler
    dailyStats: [{
        date: { type: Date },
        interactionsProcessed: { type: Number },
        memoriesCreated: { type: Number }
    }],
    
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

learningStatsSchema.index({ guildId: 1 });

module.exports = {
    Conversation: mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema),
    Fact: mongoose.models.Fact || mongoose.model('Fact', factSchema),
    Stat: mongoose.models.Stat || mongoose.model('Stat', statSchema),
    Feedback: mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema),
    Activity: mongoose.models.Activity || mongoose.model('Activity', activitySchema),
    Media: mongoose.models.Media || mongoose.model('Media', mediaSchema),
    ModLog: mongoose.models.ModLog || mongoose.model('ModLog', modLogSchema),
    // New RAG Collections (KnowledgeBase imported separately)
    ServerCache: mongoose.models.ServerCache || mongoose.model('ServerCache', serverCacheSchema),
    MemoryStore: mongoose.models.MemoryStore || mongoose.model('MemoryStore', memoryStoreSchema),
    LearningStats: mongoose.models.LearningStats || mongoose.model('LearningStats', learningStatsSchema),
    KnowledgeBase // Import from separate model file
};
