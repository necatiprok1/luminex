const { ChannelType, PermissionsBitField } = require('discord.js');
const { hasPermission, findUser, findRole, findChannel } = require('../ai-commands-util');

module.exports = {
    async execute(guild, message, command, params, client) { // client added for consistency
        const channel = message.channel;

        switch (command) {
            // --- KANALLAR ---
            case 'kanal-ekle':
            case 'kanal-olustur':
            case 'add-channel':
            case 'create-channel': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const name = params[0] || 'yeni-kanal';
                const type = params[1]?.toLowerCase() === 'ses' ? ChannelType.GuildVoice : ChannelType.GuildText;
                const parentCategory = params[2] ? await findChannel(guild, params[2]) : undefined;
                
                try {
                    const newCh = await guild.channels.create({ 
                        name, 
                        type,
                        parent: parentCategory?.id || undefined,
                        reason: `Bot tarafından oluşturuldu - ${message.author.username}`
                    });
                    return { success: true, message: `📢 Kanal açıldı: <#${newCh.id}>` };
                } catch (error) {
                    return { success: false, message: `❌ Kanal oluşturmada hata: ${error.message}` };
                }
            }

            case 'kanal-sil': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const target = await findChannel(guild, params.join(' '));
                if (!target) return { success: false, message: '❌ Kanal bulunamadı.' };
                await target.delete();
                return { success: true, message: `🗑️ **${target.name}** silindi.` };
            }

            case 'kanal-temizle': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const amount = Math.min(parseInt(params[0]) || 100, 100);
                const deleted = await channel.bulkDelete(amount, true);
                return { success: true, message: `🧹 **${deleted.size}** mesaj temizlendi.` };
            }

            case 'kanal-kilitle': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                return { success: true, message: '🔒 Kanal kilitlendi.' };
            }

            case 'kanal-ac': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
                return { success: true, message: '🔓 Kanal açıldı.' };
            }

            // Phase 3: New channel commands
            case 'kanal-yeniden-adlandır':
            case 'kanal-isim-degistir':
            case 'rename-channel': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                
                // Find channel by ID or name
                let targetChannel = null;
                if (params[0]) {
                    targetChannel = await findChannel(guild, params[0]);
                }
                if (!targetChannel) targetChannel = channel;
                
                const newName = params[1];
                if (!newName) return { success: false, message: '❌ Yeni kanal adı gerekli.' };
                
                try {
                    const oldName = targetChannel.name;
                    await targetChannel.setName(newName);
                    return { success: true, message: `✏️ Kanal adı **#${oldName}** → **#${newName}** olarak değiştirildi.` };
                } catch (error) {
                    return { success: false, message: `❌ Hata: ${error.message}` };
                }
            }

            case 'kanal-konu-degistir':
            case 'kanal-topic':
            case 'set-channel-topic': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                
                // Find channel by ID or name
                let targetChannel = null;
                if (params[0]) {
                    targetChannel = await findChannel(guild, params[0]);
                }
                if (!targetChannel) targetChannel = channel;
                
                const newTopic = params.slice(1).join(':') || '';
                
                try {
                    await targetChannel.setTopic(newTopic);
                    return { success: true, message: `📝 Kanal konusu güncellendi: "${newTopic}"` };
                } catch (error) {
                    return { success: false, message: `❌ Hata: ${error.message}` };
                }
            }

            case 'kanal-yetki-ayarla': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetChannel = (await findChannel(guild, params[0])) || channel;
                const targetRole = await findRole(guild, params[1]);
                if (!targetRole) return { success: false, message: '❌ Rol bulunamadı.' };

                const permType = params[2]?.toLowerCase();
                const action = params[3]?.toLowerCase();
                if (!permType || !action) return { success: false, message: '❌ Eksik parametre.' };

                let flag;
                if (permType === 'izle') flag = PermissionsBitField.Flags.ViewChannel;
                else if (permType === 'yaz') flag = PermissionsBitField.Flags.SendMessages;
                else if (permType === 'baglan') flag = PermissionsBitField.Flags.Connect;
                else return { success: false, message: '❌ Geçersiz yetki tipi.' };

                const allow = (action === 'ac' || action === 'ver');
                await targetChannel.permissionOverwrites.edit(targetRole, { [flag]: allow });
                return { success: true, message: `✅ Yetki güncellendi.` };
            }


            // --- ROLLER ---
            case 'rol-olustur': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const newRole = await guild.roles.create({
                    name: params[0] || 'Yeni Rol',
                    color: params[1] || '#99aab5'
                });
                return { success: true, message: `🎭 Rol oluşturuldu: <@&${newRole.id}>` };
            }

            case 'rol-sil': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const role = await findRole(guild, params.join(' '));
                if (!role) return { success: false, message: '❌ Rol bulunamadı.' };
                await role.delete();
                return { success: true, message: `🗑️ **${role.name}** silindi.` };
            }

            case 'rol-ver': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                // params: [kullanici, ...rolAdi]
                const user = await findUser(guild, params[0]);
                const roleName = params.slice(1).join(' ');
                const role = await findRole(guild, roleName);
                if (!user || !role) return { success: false, message: '❌ Kullanıcı veya rol bulunamadı.' };
                await user.roles.add(role);
                return { success: true, message: `✅ Rol verildi.` };
            }

            case 'rol-al': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok.' };
                const user = await findUser(guild, params[0]);
                const roleName = params.slice(1).join(' ');
                const role = await findRole(guild, roleName);
                if (!user || !role) return { success: false, message: '❌ Kullanıcı veya rol bulunamadı.' };
                await user.roles.remove(role);
                return { success: true, message: `✅ Rol alındı.` };
            }
            case 'rol-duzenle': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetRole = await findRole(guild, params[0]);
                if (!targetRole) return { success: false, message: '❌ Rol bulunamadı.' };

                const updates = {};
                if (params[1]) updates.name = params[1];
                if (params[2]) updates.color = params[2];

                await targetRole.edit(updates);
                return { success: true, message: `✏️ Rol düzenlendi.` };
            }

            // --- OTOMASYON (Otorol & Hoşgeldin vb) ---
            case 'otorol-ayarla': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const role = await findRole(guild, params.join(' '));
                if (!role) return { success: false, message: '❌ Rol bulunamadı.' };

                const db = require('../mongodb-helper');
                await db.set(`otorol_${guild.id}`, role.id);
                return { success: true, message: `✅ Otorol ayarlandı: <@&${role.id}>` };
            }

            case 'otorol-sifirla': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const db = require('../mongodb-helper');
                await db.delete(`otorol_${guild.id}`);
                return { success: true, message: `🗑️ Otorol sıfırlandı.` };
            }

            case 'hosgeldin-kanal-ayarla': {
                if (!hasPermission(message, 'admin')) return { success: false, message: '❌ Yetkiniz yok!' };
                const targetChannel = (await findChannel(guild, params[0])) || channel;
                const db = require('../mongodb-helper');
                await db.set(`hosgeldin_kanal_${guild.id}`, targetChannel.id);
                return { success: true, message: `✅ Hoşgeldin kanalı: <#${targetChannel.id}>` };
            }

            case 'duyuru':
            case 'duyuru-gonder': {
                // params: [kanalAdi, ...mesaj]
                // "kanalAdi" özel keywords olabilir: "hosgeldin", "genel", "duyuru"
                if (!hasPermission(message, 'admin') && !hasPermission(message, 'owner'))
                    return { success: false, message: '❌ Yetkiniz yok.' };

                const targetName = params[0];
                const content = params.slice(1).join(' ');

                if (!content) return { success: false, message: '❌ Mesaj içeriği boş.' };

                let targetChannel;
                const db = require('../mongodb-helper');

                if (targetName === 'hosgeldin') {
                    const welcomeChId = await db.fetch(`hosgeldin_kanal_${guild.id}`);
                    if (welcomeChId) targetChannel = guild.channels.cache.get(welcomeChId);
                }

                if (!targetChannel) {
                    // Normal kanal araması
                    targetChannel = await findChannel(guild, targetName);
                }

                // Eğer hala yoksa ve "hosgeldin" denmişse, AI'ın hatası olabilir, mevcut kanala yazalım mı?
                // Hayır, "kanal bulunamadı" dönelim ki AI öğrensin.
                if (!targetChannel) return { success: false, message: `❌ Kanal bulunamadı: ${targetName}` };

                try {
                    await targetChannel.send(content);
                    return { success: true, message: `✅ Duyuru gönderildi: <#${targetChannel.id}>` };
                } catch (error) {
                    return { success: false, message: `❌ Duyuru gönderme başarısız: ${error.message || error}` };
                }
            }
        }
        return null;
    }
};
