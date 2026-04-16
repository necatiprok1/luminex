const { Events } = require("discord.js");

// Bu dosya SADECE "üye sunucudan AYRILDIĞINDA" (çıktığında) çalışır.
module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (!member.guild) return;

        try {
            const logSystem = require('../utils/log-system');
            await logSystem.logMemberRemove(member);
        } catch (e) {
            console.warn('[MEMBER-REMOVE] ⚠️  Failed to log member removal:', e.message);
        }

        try {
            const analytics = require('../utils/analytics-system');
            analytics.trackMemberFlow(member.guild.id, 'leaves');
        } catch (e) {
            console.warn('[MEMBER-REMOVE] ⚠️  Failed to track member flow:', e.message);
        }
    }
};
