const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { hasPermission, findUser, findRole } = require('../ai-commands-util');
const db = require('croxydb');
const moment = require('moment');

module.exports = {
    async execute(guild, message, command, params, client) {
        const channel = message.channel;

        switch (command) {
            case 'kullanici-rol-sorgula': {
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Kullanıcı bulunamadı.' };

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
            }

            case 'kullanici-bilgi': {
                const targetUser = await findUser(guild, params[0]);
                if (!targetUser) return { success: false, message: '❌ Bulunamadı.' };
                const embed = new EmbedBuilder()
                    .setTitle(targetUser.user.tag)
                    .addFields({ name: 'ID', value: targetUser.id })
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
                return { success: true, message: null };
            }

            case 'en-fazla-rol': {
                await guild.members.fetch();
                const top = guild.members.cache.sort((a, b) => b.roles.cache.size - a.roles.cache.size).first(5);
                return { success: true, message: `🏆 **Top 5 Rol:**\n${top.map(m => `${m.user.tag}: ${m.roles.cache.size}`).join('\n')}` };
            }

            case 'sunucu-analiz': {
                await guild.members.fetch();
                return { success: true, message: `📊 **Analiz:**\nÜyeler: ${guild.memberCount}\nKanallar: ${guild.channels.cache.size}` };
            }

            // --- HAFIZA ---
            case 'bilgi-ekle': {
                const subject = params[0];
                const info = params.slice(1).join(' ');
                // Memory logic... we delegate this to Memory Module but commands handle it here simply
                // For consistenty let's just use croxydb directly as before but using the new structure
                // Actually `utils/memory.js` has the logic. 
                // Let's import it? Or keep direct DB usage here to match old behavior?
                // The old code used `db.get('memory_' + guild.id)`. 
                // The new memory.js uses `memory_facts_GUILD`.
                // Let's align with new memory structure.

                const { logFact } = require('../memory');
                await logFact(guild.id, subject, info, message.author.tag);
                return { success: true, message: `📝 Bilgi eklendi: ${subject}` };
            }

            case 'hafiza-listele': {
                const { searchMemory } = require('../memory');
                const res = await searchMemory(guild.id, "", 10);
                return { success: true, message: `🧠 **Hafıza:**\n${res || 'Boş'}` };
            }

            case 'ai-durum': {
                return { success: true, message: `🤖 Uptime: ${Math.floor(process.uptime())}s | Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB` };
            }
        }
        return null;
    }
};
