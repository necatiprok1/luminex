const db = require('croxydb');
const moment = require('moment');

/**
 * 🤖 Luminex Memory System (CroxyDB Powered)
 * Dosya sistemi yerine veritabanı kullanımı.
 */

const MAX_CONVERSATION_HISTORY = 30; // Global Limit

/**
 * Konuşmayı kaydet
 */
function logConversation(guildId, userId, username, userMessage, aiResponse) {
    // Guild bazlı saklama daha güvenli ve yönetilebilir
    const key = `memory_conversations_${guildId}`;
    let history = db.fetch(key) || [];

    history.push({
        userId,
        username,
        userMessage,
        aiResponse,
        timestamp: Date.now()
    });

    // Limit kontrolü
    if (history.length > MAX_CONVERSATION_HISTORY) {
        history = history.slice(-MAX_CONVERSATION_HISTORY);
    }

    db.set(key, history);
}

/**
 * Bilgi (Fact) kaydet
 */
function logFact(guildId, topic, info, source = 'System') {
    const key = `memory_facts_${guildId}`;
    let facts = db.fetch(key) || [];

    // Tekrar kontrolü
    if (!facts.find(f => f.info === info)) {
        facts.push({
            topic,
            info,
            source,
            timestamp: Date.now()
        });
        db.set(key, facts);
        return true;
    }
    return false;
}

/**
 * İlgili konuşmaları veya bilgileri ara
 */
function searchMemory(guildId, query, limit = 5) {
    const conversations = db.fetch(`memory_conversations_${guildId}`) || [];
    const facts = db.fetch(`memory_facts_${guildId}`) || [];
    const queryLower = query.toLowerCase();

    // Sohbetlerde ara
    const relatedChats = conversations
        .filter(c =>
            (c.userMessage && c.userMessage.toLowerCase().includes(queryLower)) ||
            (c.aiResponse && c.aiResponse.toLowerCase().includes(queryLower))
        )
        .slice(-limit)
        .map(c => `[Sohbet] ${c.username}: ${c.userMessage} -> AI: ${c.aiResponse}`);

    // Bilgilerde ara
    const relatedFacts = facts
        .filter(f =>
            (f.topic && f.topic.toLowerCase().includes(queryLower)) ||
            (f.info && f.info.toLowerCase().includes(queryLower))
        )
        .slice(-limit)
        .map(f => `[Bilgi - ${f.topic}] ${f.info}`);

    return [...relatedChats, ...relatedFacts].join('\n');
}

/**
 * Son konuşmaları getir (Context için)
 */
function getRecentContext(guildId, limit = 10) {
    const conversations = db.fetch(`memory_conversations_${guildId}`) || [];
    return conversations
        .slice(-limit)
        .map(c => `${c.username}: ${c.userMessage}\nLuminex: ${c.aiResponse}`)
        .join('\n\n');
}

module.exports = {
    logConversation,
    logFact,
    searchMemory,
    getRecentContext,

    // --- STATISTICAL MEMORY (Tahmine Dayalı Analiz İçin) ---
    logStat(guildId, statType, value) {
        const key = `stats_${guildId}_${statType}`;
        let stats = db.fetch(key) || [];

        // Yeni veriyi ekle
        stats.push({ value, date: Date.now() });

        // Sadece son 24 saati (veya son 50 veriyi) tut
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        stats = stats.filter(s => s.date > oneDayAgo).slice(-50);

        db.set(key, stats);
        return true;
    },

    getTrends(guildId, statType) {
        const stats = db.fetch(`stats_${guildId}_${statType}`) || [];
        if (stats.length < 2) return "Yeterli veri yok (Stabil)";

        const first = stats[0].value;
        const last = stats[stats.length - 1].value;
        const diff = last - first;

        if (diff > 0) return "📈 Yükseliş Eğiliminde";
        if (diff < 0) return "📉 Düşüş Eğiliminde";
        return "➡️ Stabil";
    },

    // --- ADAPTIVE LEARNING (Geri Bildirim) ---
    logFeedback(guildId, proposalType, isAccepted) {
        const key = `feedback_${guildId}`;
        let feedback = db.fetch(key) || [];

        feedback.push({ type: proposalType, accepted: isAccepted, date: Date.now() });
        feedback = feedback.slice(-20); // Son 20 kayıt
        db.set(key, feedback);
    },

    getAdaptiveProfile(guildId) {
        const feedback = db.fetch(`feedback_${guildId}`) || [];
        if (feedback.length === 0) return "Henüz yeterli adaptasyon verisi yok.";

        const accepted = feedback.filter(h => h.accepted).length;
        const total = feedback.length;
        const rate = Math.round((accepted / total) * 100);

        // En çok kabul edilen türü bul
        const types = {};
        feedback.filter(h => h.accepted).forEach(h => {
            types[h.type] = (types[h.type] || 0) + 1;
        });
        const favType = Object.keys(types).sort((a, b) => types[b] - types[a])[0] || "Genel";

        return `Öneri Kabul Oranı: %${rate} | Favori Konu: ${favType}`;
    },

    // --- ACTIVITY TRACKING (Kanal Yoğunluk Analizi) ---
    logChannelActivity(guildId, channelId, channelName) {
        // Basitçe o günün o saati için sayacı artır
        const now = new Date();
        const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}`;
        const key = `activity_${guildId}_${channelId}_${hourKey}`;

        db.add(key, 1);

        // Kanal ismini meta olarak kaydet (İstatistik için)
        db.set(`meta_channel_name_${channelId}`, channelName);

        // Bu saatin anahtarını kaydet ki sonra temizleyebilelim (opsiyonel, şimdilik basit tutuyoruz)
        const hourListKey = `activity_keys_${guildId}`;
        const keys = db.fetch(hourListKey) || [];
        if (!keys.includes(key)) {
            keys.push(key);
            // Çok şişmemesi için son 100 saati tut
            if (keys.length > 100) {
                const oldKey = keys.shift();
                db.delete(oldKey);
            }
            db.set(hourListKey, keys);
        }
    },

    getActivityReport(guildId) {
        const now = new Date();
        const currentHourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}`;

        // Tüm kanalları gezmek yerine bildiğimiz kanallardan gitmek lazım ama DB yapısı gereği keyleri bilmeliyiz.
        // Basit çözüm: Proaktif kanallar listesi veya son aktif kanallar meta verisinden çekilebilir.
        // Şimdilik db'den 'activity_keys' ile son saatteki aktif olanları bulalım.

        const keyList = db.fetch(`activity_keys_${guildId}`) || [];
        const currentHourKeys = keyList.filter(k => k.endsWith(currentHourKey));

        let report = [];
        for (const key of currentHourKeys) {
            // key format: activity_GUILD_CHANNEL_TIME
            const parts = key.split('_');
            const channelId = parts[2];
            const count = db.fetch(key) || 0;
            const name = db.fetch(`meta_channel_name_${channelId}`) || channelId;

            report.push({ name, count });
        }

        report.sort((a, b) => b.count - a.count);

        const top = report.slice(0, 3).map(c => `${c.name}: ${c.count} msg`).join(', ');
        const totalMsg = report.reduce((summ, c) => summ + c.count, 0);

        let status = "Stabil";
        if (totalMsg > 50) status = "🔥 Yüksek Etkileşim";
        else if (totalMsg < 5) status = "❄️ Düşük Etkileşim (Ölü)";

        return `Durum: ${status} | En Aktif Kanallar (Son 1 Saat): ${top || "Yok"}`;
    },

    // --- VISION TRENDS (Görsel İçerik Analizi) ---
    logMediaActivity(guildId, channelId) {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const key = `vision_${guildId}_${channelId}_${dateKey}`;

        db.add(key, 1);

        // Kanal listesini tut
        const listKey = `vision_channels_${guildId}_${dateKey}`;
        let channels = db.fetch(listKey) || [];
        if (!channels.includes(channelId)) {
            channels.push(channelId);
            db.set(listKey, channels);
        }
    },

    getVisionTrends(guildId) {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

        const channels = db.fetch(`vision_channels_${guildId}_${dateKey}`) || [];
        if (channels.length === 0) return "Görsel veri yok.";

        let maxCount = 0;
        let maxChannelId = null;

        for (const chanId of channels) {
            const count = db.fetch(`vision_${guildId}_${chanId}_${dateKey}`) || 0;
            if (count > maxCount) {
                maxCount = count;
                maxChannelId = chanId;
            }
        }

        if (maxChannelId) {
            return `Bugün En Çok Görsel: <#${maxChannelId}> (${maxCount} medya)`;
        }
        return "Bugün henüz görsel paylaşımı yok.";
    }
};
