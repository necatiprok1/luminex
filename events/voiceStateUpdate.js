const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        // ═══════════════════════════════════════
        // 📋 GELİŞMİŞ LOG: SES KANALI
        // ═══════════════════════════════════════
        try {
            const logSystem = require('../utils/log-system');
            const member = newState.member || oldState.member;
            if (!member) return;

            let embed;

            if (!oldState.channelId && newState.channelId) {
                // Ses kanalına katıldı
                embed = new EmbedBuilder()
                    .setDescription(`🔊 **${member.user.tag}** ses kanalına katıldı: <#${newState.channelId}>`)
                    .setColor('#2ECC71')
                    .setTimestamp();
            }
            else if (oldState.channelId && !newState.channelId) {
                // Ses kanalından ayrıldı
                embed = new EmbedBuilder()
                    .setDescription(`🔇 **${member.user.tag}** ses kanalından ayrıldı: <#${oldState.channelId}>`)
                    .setColor('#E74C3C')
                    .setTimestamp();
            }
            else if (oldState.channelId !== newState.channelId) {
                // Kanal değiştirdi
                embed = new EmbedBuilder()
                    .setDescription(`🔀 **${member.user.tag}** ses kanalı değiştirdi:\n<#${oldState.channelId}> → <#${newState.channelId}>`)
                    .setColor('#F1C40F')
                    .setTimestamp();
            }
            else if (oldState.serverMute !== newState.serverMute) {
                embed = new EmbedBuilder()
                    .setDescription(`${newState.serverMute ? '🔇' : '🔊'} **${member.user.tag}** ${newState.serverMute ? 'susturuldu' : 'susturması kaldırıldı'}`)
                    .setColor(newState.serverMute ? '#E74C3C' : '#2ECC71')
                    .setTimestamp();
            }
            else if (oldState.serverDeaf !== newState.serverDeaf) {
                embed = new EmbedBuilder()
                    .setDescription(`${newState.serverDeaf ? '🔇' : '🔊'} **${member.user.tag}** ${newState.serverDeaf ? 'sağır edildi' : 'sağırlığı kaldırıldı'}`)
                    .setColor(newState.serverDeaf ? '#E74C3C' : '#2ECC71')
                    .setTimestamp();
            }

            if (embed) {
                logSystem.send(guild, embed);
            }
        } catch {}
    }
};
