const db = require('./mongodb-helper');
const mongoose = require('mongoose');
const { Conversation, Fact, Stat, Feedback, Activity, Media } = require('../models/GuildMemory');

const MAX_CONVERSATION_HISTORY = 30;

function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

async function logConversation(guildId, userId, username, userMessage, aiResponse) {
    if (isMongoConnected()) {
        try {
            const count = await Conversation.countDocuments({ guildId });
            if (count >= MAX_CONVERSATION_HISTORY) {
                const oldest = await Conversation.findOne({ guildId }).sort({ timestamp: 1 });
                if (oldest) await Conversation.findByIdAndDelete(oldest._id);
            }
            await Conversation.create({ guildId, userId, username, userMessage, aiResponse });
        } catch (err) { console.error('MongoDB logConversation Error:', err); }
    } else {
        const key = `memory_conversations_${guildId}`;
        let history = (await db.fetch(key)) || [];
        history.push({ userId, username, userMessage, aiResponse, timestamp: Date.now() });
        if (history.length > MAX_CONVERSATION_HISTORY) history = history.slice(-MAX_CONVERSATION_HISTORY);
        await db.set(key, history);
    }
}

async function logFact(guildId, topic, info, source = 'System') {
    if (isMongoConnected()) {
        try {
            const exists = await Fact.findOne({ guildId, info });
            if (!exists) {
                await Fact.create({ guildId, topic, info, source });
                return true;
            }
        } catch (err) { console.error('MongoDB logFact Error:', err); }
        return false;
    } else {
        const key = `memory_facts_${guildId}`;
        let facts = (await db.fetch(key)) || [];
        if (!facts.find(f => f.info === info)) {
            facts.push({ topic, info, source, timestamp: Date.now() });
            await db.set(key, facts);
            return true;
        }
        return false;
    }
}

async function searchMemory(guildId, query, limit = 5) {
    const queryLower = query.toLowerCase();
    let relatedChats = [];
    let relatedFacts = [];

    if (isMongoConnected()) {
        try {
            const conversations = await Conversation.find({
                guildId,
                $or: [
                    { userMessage: { $regex: queryLower, $options: 'i' } },
                    { aiResponse: { $regex: queryLower, $options: 'i' } }
                ]
            }).sort({ timestamp: -1 }).limit(limit);

            relatedChats = conversations.reverse().map(c => `[Sohbet] ${c.username}: ${c.userMessage} -> AI: ${c.aiResponse}`);

            const facts = await Fact.find({
                guildId,
                $or: [
                    { topic: { $regex: queryLower, $options: 'i' } },
                    { info: { $regex: queryLower, $options: 'i' } }
                ]
            }).sort({ timestamp: -1 }).limit(limit);

            relatedFacts = facts.reverse().map(f => `[Bilgi - ${f.topic}] ${f.info}`);
        } catch (err) { console.error('MongoDB searchMemory Error:', err); }
    } else {
        const conversations = (await db.fetch(`memory_conversations_${guildId}`)) || [];
        const facts = (await db.fetch(`memory_facts_${guildId}`)) || [];

        relatedChats = conversations.filter(c => (c.userMessage && c.userMessage.toLowerCase().includes(queryLower)) || (c.aiResponse && c.aiResponse.toLowerCase().includes(queryLower))).slice(-limit).map(c => `[Sohbet] ${c.username}: ${c.userMessage} -> AI: ${c.aiResponse}`);
        relatedFacts = facts.filter(f => (f.topic && f.topic.toLowerCase().includes(queryLower)) || (f.info && f.info.toLowerCase().includes(queryLower))).slice(-limit).map(f => `[Bilgi - ${f.topic}] ${f.info}`);
    }

    return [...relatedChats, ...relatedFacts].join('\n');
}

async function getRecentContext(guildId, limit = 10) {
    if (isMongoConnected()) {
        try {
            const conversations = await Conversation.find({ guildId }).sort({ timestamp: -1 }).limit(limit);
            return conversations.reverse().map(c => `${c.username}: ${c.userMessage}\nLuminex: ${c.aiResponse}`).join('\n\n');
        } catch (err) { console.error('MongoDB getRecentContext Error:', err); return ""; }
    } else {
        const conversations = (await db.fetch(`memory_conversations_${guildId}`)) || [];
        return conversations.slice(-limit).map(c => `${c.username}: ${c.userMessage}\nLuminex: ${c.aiResponse}`).join('\n\n');
    }
}

async function logStat(guildId, statType, value) {
    if (isMongoConnected()) {
        try {
            await Stat.create({ guildId, statType, value });
            return true;
        } catch (err) { console.error('MongoDB logStat Error:', err); return false; }
    } else {
        const key = `stats_${guildId}_${statType}`;
        let stats = (await db.fetch(key)) || [];
        stats.push({ value, date: Date.now() });
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        stats = stats.filter(s => s.date > oneDayAgo).slice(-50);
        await db.set(key, stats);
        return true;
    }
}

async function getTrends(guildId, statType) {
    if (isMongoConnected()) {
        try {
            const stats = await Stat.find({ guildId, statType }).sort({ date: 1 });
            if (stats.length < 2) return "Yeterli veri yok (Stabil)";
            const diff = stats[stats.length - 1].value - stats[0].value;
            if (diff > 0) return "📈 Yükseliş Eğiliminde";
            if (diff < 0) return "📉 Düşüş Eğiliminde";
            return "➡️ Stabil";
        } catch (err) { console.error('MongoDB getTrends Error:', err); return "Bilinmiyor"; }
    } else {
        const stats = (await db.fetch(`stats_${guildId}_${statType}`)) || [];
        if (stats.length < 2) return "Yeterli veri yok (Stabil)";
        const diff = stats[stats.length - 1].value - stats[0].value;
        if (diff > 0) return "📈 Yükselme Eğiliminde";
        if (diff < 0) return "📉 Düşüş Eğiliminde";
        return "➡️ Stabil";
    }
}

async function logFeedback(guildId, proposalType, isAccepted) {
    if (isMongoConnected()) {
        try {
            await Feedback.create({ guildId, type: proposalType, accepted: isAccepted });
        } catch (err) { console.error('MongoDB logFeedback Error:', err); }
    } else {
        const key = `feedback_${guildId}`;
        let feedback = (await db.fetch(key)) || [];
        feedback.push({ type: proposalType, accepted: isAccepted, date: Date.now() });
        feedback = feedback.slice(-20);
        await db.set(key, feedback);
    }
}

async function getAdaptiveProfile(guildId) {
    let feedback = [];
    if (isMongoConnected()) {
        try {
            feedback = await Feedback.find({ guildId }).sort({ date: -1 }).limit(20);
        } catch (err) { console.error('MongoDB getAdaptiveProfile Error:', err); }
    } else {
        feedback = (await db.fetch(`feedback_${guildId}`)) || [];
    }

    if (feedback.length === 0) return "Henüz yeterli adaptasyon verisi yok.";
    const accepted = feedback.filter(h => h.accepted).length;
    const rate = Math.round((accepted / feedback.length) * 100);
    const types = {};
    feedback.filter(h => h.accepted).forEach(h => types[h.type] = (types[h.type] || 0) + 1);
    const favType = Object.keys(types).sort((a, b) => types[b] - types[a])[0] || "Genel";
    return `Öneri Kabul Oranı: %${rate} | Favori Konu: ${favType}`;
}

async function logChannelActivity(guildId, channelId, channelName) {
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}`;
    if (isMongoConnected()) {
        try {
            let act = await Activity.findOne({ guildId, channelId, hourKey });
            if (act) { act.count += 1; act.channelName = channelName; await act.save(); }
            else { await Activity.create({ guildId, channelId, channelName, count: 1, hourKey }); }
        } catch (err) { console.error('MongoDB logChannelActivity Error:', err); }
    } else {
        const key = `activity_${guildId}_${channelId}_${hourKey}`;
        const current = (await db.fetch(key)) || 0;
        await db.set(key, current + 1);
        await db.set(`meta_channel_name_${channelId}`, channelName);
        const hourListKey = `activity_keys_${guildId}`;
        const keys = (await db.fetch(hourListKey)) || [];
        if (!keys.includes(key)) {
            keys.push(key);
            if (keys.length > 100) await db.delete(keys.shift());
            await db.set(hourListKey, keys);
        }
    }
}

async function getActivityReport(guildId) {
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}`;
    let report = [];

    if (isMongoConnected()) {
        try {
            const activities = await Activity.find({ guildId, hourKey });
            report = activities.map(a => ({ name: a.channelName || a.channelId, count: a.count }));
        } catch (err) { console.error('MongoDB getActivityReport Error:', err); }
    } else {
        const keyList = (await db.fetch(`activity_keys_${guildId}`)) || [];
        const currentHourKeys = keyList.filter(k => k.endsWith(hourKey));
        for (const key of currentHourKeys) {
            const channelId = key.split('_')[2];
            const count = (await db.fetch(key)) || 0;
            const name = (await db.fetch(`meta_channel_name_${channelId}`)) || channelId;
            report.push({ name, count });
        }
    }

    report.sort((a, b) => b.count - a.count);
    const top = report.slice(0, 3).map(c => `${c.name}: ${c.count} msg`).join(', ');
    const totalMsg = report.reduce((summ, c) => summ + c.count, 0);

    let status = "Stabil";
    if (totalMsg > 50) status = "🔥 Yüksek Etkileşim";
    else if (totalMsg < 5) status = "❄️ Düşük Etkileşim (Ölü)";

    return `Durum: ${status} | En Aktif Kanallar (Son 1 Saat): ${top || "Yok"}`;
}

async function logMediaActivity(guildId, channelId) {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (isMongoConnected()) {
        try {
            let act = await Media.findOne({ guildId, channelId, dateKey });
            if (act) { act.count += 1; await act.save(); }
            else { await Media.create({ guildId, channelId, dateKey, count: 1 }); }
        } catch (err) { console.error('MongoDB logMediaError:', err); }
    } else {
        const key = `vision_${guildId}_${channelId}_${dateKey}`;
        const current = (await db.fetch(key)) || 0;
        await db.set(key, current + 1);
        const listKey = `vision_channels_${guildId}_${dateKey}`;
        let channels = (await db.fetch(listKey)) || [];
        if (!channels.includes(channelId)) { channels.push(channelId); await db.set(listKey, channels); }
    }
}

async function getVisionTrends(guildId) {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (isMongoConnected()) {
        try {
            const media = await Media.find({ guildId, dateKey }).sort({ count: -1 }).limit(1);
            if (media.length > 0) return `Bugün En Çok Görsel: <#${media[0].channelId}> (${media[0].count} medya)`;
        } catch (err) { console.error('MongoDB getVisionTrends Error:', err); }
        return "Bugün henüz görsel paylaşımı yok.";
    } else {
        const channels = (await db.fetch(`vision_channels_${guildId}_${dateKey}`)) || [];
        if (channels.length === 0) return "Görsel veri yok.";
        let maxCount = 0; let maxChannelId = null;
        for (const chanId of channels) {
            const count = (await db.fetch(`vision_${guildId}_${chanId}_${dateKey}`)) || 0;
            if (count > maxCount) { maxCount = count; maxChannelId = chanId; }
        }
        if (maxChannelId) return `Bugün En Çok Görsel: <#${maxChannelId}> (${maxCount} medya)`;
        return "Bugün henüz görsel paylaşımı yok.";
    }
}

module.exports = {
    logConversation, logFact, searchMemory, getRecentContext, logStat, getTrends, logFeedback, getAdaptiveProfile, logChannelActivity, getActivityReport, logMediaActivity, getVisionTrends
};
