const { Events } = require("discord.js");

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;
        if (message.partial) return; // Partial mesajları atlat

        try {
            const logSystem = require('../utils/log-system');
            await logSystem.logMessageDelete(message);
        } catch (e) {
            // Log sistemi yoksa veya hata varsa sessizce geç
        }
    }
};
