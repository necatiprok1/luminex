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
                await targetUser.ban({ reason });
                try { await logSystem.logModeration(guild, 'ban', message.author, targetUser.user, reason); } catch (e) {}
                return { success: true, message: `🔨 **${targetUser.user.tag}** yasaklandı!` };
            }

            case 'kick': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                const reason = params.slice(1).join(' ') || 'AI Atma';
                await targetUser.kick(reason);
                try { await logSystem.logModeration(guild, 'kick', message.author, targetUser.user, reason); } catch (e) {}
                return { success: true, message: `👢 **${targetUser.user.tag}** atıldı!` };
            }

            case 'timeout': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                const duration = parseInt(params[1]) || 5;
                const reason = params.slice(2).join(' ') || 'AI Timeout';
                await targetUser.timeout(duration * 60 * 1000, reason);
                try { await logSystem.logModeration(guild, 'timeout', message.author, targetUser.user, `${reason} • ${duration}dk`); } catch (e) {}
                return { success: true, message: `🔇 **${targetUser.user.tag}** ${duration} dakika susturuldu.` };
            }

            case 'sil': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const amount = Math.min(parseInt(params[0]) || 10, 100);
                const deleted = await channel.bulkDelete(amount, true);
                return { success: true, message: `🗑️ **${deleted.size}** mesaj silindi.` };
            }

            case 'yavas-mod':
            case 'slowmode': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const seconds = parseInt(params[0]) || 0;
                await channel.setRateLimitPerUser(seconds);
                return { success: true, message: `🐌 Yavaş mod: **${seconds}** saniye.` };
            }
        }
        return null; // Not handled here
    }
};
