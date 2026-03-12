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
            // Log sistemi yoksa sessizce geç
        }
    }
};
