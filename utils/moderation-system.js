const db = require('croxydb');
const { ModLog } = require('../models/GuildMemory');
const mongoose = require('mongoose');

/**
 * 🛡️ Katmanlı Uyarı ve Sicil Sistemi
 */
class ModerationSystem {
    /**
     * Kullanıcıya uyarı ekle ve cezayı uygula
     */
    static async addWarning(guild, member, moderator, reason, content = "") {
        const guildId = guild.id;
        const userId = member.id;

        // 1. Uyarı Sayısını Artır
        const warningKey = `warncount_${guildId}_${userId}`;
        const currentWarns = (db.get(warningKey) || 0) + 1;
        db.set(warningKey, currentWarns);

        // 2. MongoDB'ye Kaydet (Sicil)
        if (mongoose.connection.readyState === 1) {
            try {
                await ModLog.create({
                    guildId,
                    action: 'UYARI',
                    moderatorId: moderator.id,
                    moderatorTag: moderator.tag || moderator.username,
                    targetId: userId,
                    targetTag: member.user.tag,
                    reason: `${reason} (Uyarı #${currentWarns})`,
                    content,
                    timestamp: new Date()
                });
            } catch (err) { console.error('ModLog Save Error:', err); }
        }

        // 3. Katmanlı Ceza Sistemi
        let punishment = "Uyarıldı";
        let punishmentApplied = false;

        try {
            if (currentWarns >= 10) {
                // 10 Uyarı -> BAN
                await member.ban({ reason: `Otomatik Ceza: 10 Uyarı Sınırı (${reason})` });
                punishment = "BANLANDI (10+ Uyarı)";
                punishmentApplied = true;
            } else if (currentWarns >= 5) {
                // 5 Uyarı -> KICK
                await member.kick(`Otomatik Ceza: 5 Uyarı Sınırı (${reason})`);
                punishment = "SUNUCUDAN ATILDI (5+ Uyarı)";
                punishmentApplied = true;
            } else if (currentWarns >= 3) {
                // 3 Uyarı -> TIMEOUT (1 Saat)
                await member.timeout(60 * 60 * 1000, `Otomatik Ceza: 3 Uyarı Sınırı (${reason})`);
                punishment = "MUTELANDI (1 Saat - 3+ Uyarı)";
                punishmentApplied = true;
            }
        } catch (err) {
            console.error(`[MODERATION] Ceza uygulama hatası (${member.user.tag}):`, err.message);
        }

        return {
            currentWarns,
            punishment,
            punishmentApplied
        };
    }

    /**
     * Kullanıcının sicilini getir
     */
    static async getRecord(guildId, userId) {
        if (mongoose.connection.readyState === 1) {
            return await ModLog.find({ guildId, targetId: userId }).sort({ timestamp: -1 });
        }
        return [];
    }

    /**
     * Uyarıları sıfırla
     */
    static clearWarnings(guildId, userId) {
        db.delete(`warncount_${guildId}_${userId}`);
    }
}

module.exports = ModerationSystem;
