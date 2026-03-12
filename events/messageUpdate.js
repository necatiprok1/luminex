const { Events } = require("discord.js");

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.content === newMessage.content) return;

        try {
            const logSystem = require('../utils/log-system');
            await logSystem.logMessageUpdate(oldMessage, newMessage);
        } catch (e) {
            // Log sistemi yoksa sessizce geç
        }
    }
};
