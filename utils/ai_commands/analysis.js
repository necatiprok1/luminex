const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { hasPermission, findUser, findRole } = require('../ai-commands-util');
const db = require('../mongodb-helper');
const moment = require('moment');

module.exports = {
    async execute(guild, message, command, params, client) {
        const channel = message.channel;

        switch (command) {
            case 'kullanici-rol-sorgula': {
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

                try {
                    const roles = targetUser.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);

                    let roleList = [];
                    let i = 1;
                    roles.forEach(role => {
                        let level = "Üye", perms = "Temel", emoji = "🔹";
                        if (role.permissions.has(PermissionsBitField.Flags.Administrator)) { level = "Yönetici"; perms = "Tam Erişim"; emoji = "🥇"; }
                        else if (role.permissions.has(PermissionsBitField.Flags.ManageGuild)) { level = "Üst Düzey"; emoji = "🥈"; }

                        roleList.push(`**${i}.** <@&${role.id}> ${emoji} - ${level}`);
                        i++;
                    });

                    if (roles.size === 0) roleList.push("Özel rol yok.");

                    return { success: true, message: `**analiz:**\n${roleList.join('\n')}` };
                } catch (error) {
                    return { success: false, message: `❌ Rol sorgulama başarısız: ${error.message || error}` };
                }
            }

            case 'kullanici-bilgi': {
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Bulunamadı.' };
                try {
                    const embed = new EmbedBuilder()
                        .setTitle(targetUser.user.tag)
                        .addFields({ name: 'ID', value: targetUser.id })
                        .setTimestamp();
                    await channel.send({ embeds: [embed] });
                    return { success: true, message: null };
                } catch (error) {
                    return { success: false, message: `❌ Bilgi gönderme başarısız: ${error.message || error}` };
                }
            }

            case 'en-fazla-rol': {
                try {
                    await guild.members.fetch();
                    const top = guild.members.cache.sort((a, b) => b.roles.cache.size - a.roles.cache.size).first(5);
                    return { success: true, message: `🏆 **Top 5 Rol:**\n${top.map(m => `${m.user.tag}: ${m.roles.cache.size}`).join('\n')}` };
                } catch (error) {
                    return { success: false, message: `❌ Üye listesi alınamadı: ${error.message || error}` };
                }
            }

            case 'sunucu-analiz': {
                try {
                    await guild.members.fetch();
                    return { success: true, message: `📊 **Analiz:**\nÜyeler: ${guild.memberCount}\nKanallar: ${guild.channels.cache.size}` };
                } catch (error) {
                    return { success: false, message: `❌ Sunucu analizi başarısız: ${error.message || error}` };
                }
            }

            // --- HAFIZA ---
            case 'bilgi-ekle': {
                const subject = params[0];
                const info = params.slice(1).join(' ');
                try {
                    const { logFact } = require('../memory');
                    await logFact(guild.id, subject, info, message.author.tag);
                    return { success: true, message: `📝 Bilgi eklendi: ${subject}` };
                } catch (error) {
                    return { success: false, message: `❌ Bilgi ekleme başarısız: ${error.message || error}` };
                }
            }

            case 'hafiza-listele': {
                try {
                    const { searchMemory } = require('../memory');
                    const res = await searchMemory(guild.id, "", 10);
                    return { success: true, message: `🧠 **Hafıza:**\n${res || 'Boş'}` };
                } catch (error) {
                    return { success: false, message: `❌ Hafıza listesi başarısız: ${error.message || error}` };
                }
            }

            case 'ai-durum': {
                return { success: true, message: `🤖 Uptime: ${Math.floor(process.uptime())}s | Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB` };
            }
        }
        return null;
    }
};
