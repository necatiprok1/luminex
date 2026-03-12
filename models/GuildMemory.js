const mongoose = require('mongoose');

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

module.exports = {
    Conversation: mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema),
    Fact: mongoose.models.Fact || mongoose.model('Fact', factSchema),
    Stat: mongoose.models.Stat || mongoose.model('Stat', statSchema),
    Feedback: mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema),
    Activity: mongoose.models.Activity || mongoose.model('Activity', activitySchema),
    Media: mongoose.models.Media || mongoose.model('Media', mediaSchema)
};
