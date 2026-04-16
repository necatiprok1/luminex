const { PermissionsBitField } = require('discord.js');
const { hasPermission, findUser } = require('../ai-commands-util'); // Helper imports
const logSystem = require('../log-system');

module.exports = {
    async execute(guild, message, command, params, client) {
        const channel = message.channel;

        switch (command) {
            case 'ban': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                const reason = params.slice(1).join(' ') || 'AI Yasaklama';
                try {
                    await targetUser.ban({ reason });
                    try { await logSystem.logModeration(guild, 'ban', message.author, targetUser.user, reason); } catch (e) {}
                    return { success: true, message: `🔨 **${targetUser.user.tag}** yasaklandı!` };
                } catch (error) {
                    const msg = error.message || String(error);
                    if (msg.includes('Missing Permissions')) return { success: false, message: '❌ Yetkim yetersiz (BAN_MEMBERS gerekli)' };
                    return { success: false, message: `❌ Ban işlemi başarısız: ${msg}` };
                }
            }

            case 'kick': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                const reason = params.slice(1).join(' ') || 'AI Atma';
                try {
                    await targetUser.kick(reason);
                    try { await logSystem.logModeration(guild, 'kick', message.author, targetUser.user, reason); } catch (e) {}
                    return { success: true, message: `👢 **${targetUser.user.tag}** atıldı!` };
                } catch (error) {
                    const msg = error.message || String(error);
                    if (msg.includes('Missing Permissions')) return { success: false, message: '❌ Yetkim yetersiz (KICK_MEMBERS gerekli)' };
                    return { success: false, message: `❌ Kick işlemi başarısız: ${msg}` };
                }
            }

            case 'timeout': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                const duration = parseInt(params[1]) || 5;
                const reason = params.slice(2).join(' ') || 'AI Timeout';
                try {
                    await targetUser.timeout(duration * 60 * 1000, reason);
                    try { await logSystem.logModeration(guild, 'timeout', message.author, targetUser.user, `${reason} • ${duration}dk`); } catch (e) {}
                    return { success: true, message: `🔇 **${targetUser.user.tag}** ${duration} dakika susturuldu.` };
                } catch (error) {
                    const msg = error.message || String(error);
                    if (msg.includes('Missing Permissions')) return { success: false, message: '❌ Yetkim yetersiz (MODERATE_MEMBERS gerekli)' };
                    return { success: false, message: `❌ Timeout işlemi başarısız: ${msg}` };
                }
            }

            case 'sil': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const amount = Math.min(parseInt(params[0]) || 10, 100);
                try {
                    const deleted = await channel.bulkDelete(amount, true);
                    return { success: true, message: `🗑️ **${deleted.size}** mesaj silindi.` };
                } catch (error) {
                    return { success: false, message: `❌ Mesaj silme başarısız: ${error.message || error}` };
                }
            }

            case 'yavas-mod':
            case 'slowmode': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const seconds = parseInt(params[0]) || 0;
                try {
                    await channel.setRateLimitPerUser(seconds);
                    return { success: true, message: `🐌 Yavaş mod: **${seconds}** saniye.` };
                } catch (error) {
                    return { success: false, message: `❌ Yavaş mod ayarlama başarısız: ${error.message || error}` };
                }
            }
        }
        return null; // Not handled here
    }
};
