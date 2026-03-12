const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');

/**
 * 🎉 Luminex Çekiliş Sistemi
 * Buton tabanlı çekiliş yönetimi
 */

class GiveawaySystem {
    /**
     * Yeni çekiliş başlat
     * @param {object} client - Discord client (süre dolunca kazanan açıklamak için gerekli)
     */
    async create(channel, options) {
        const { prize, duration, winnerCount = 1, hostId, client } = options;
        const guildId = channel.guild.id;
        const endTime = Date.now() + duration;

        const embed = this.createEmbed(prize, winnerCount, endTime, hostId, []);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel('🎉 Katıl (0)')
                    .setStyle(ButtonStyle.Success)
            );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        // Çekiliş verisini kaydet
        const giveawayData = {
            messageId: msg.id,
            channelId: channel.id,
            guildId,
            prize,
            winnerCount,
            hostId,
            endTime,
            participants: [],
            ended: false,
            createdAt: Date.now()
        };

        db.set(`giveaway_${msg.id}`, giveawayData);

        // Aktif çekilişler listesine ekle
        let activeList = db.fetch(`giveaway_active_${guildId}`) || [];
        activeList.push(msg.id);
        db.set(`giveaway_active_${guildId}`, activeList);

        // Zamanlayıcı (client ile süre dolunca kazanan açıklanacak)
        this.scheduleEnd(client, msg.id, duration);

        return { success: true, messageId: msg.id };
    }

    /**
     * Katılım handler (buton) - Toggle: Katıl / Ayrıl
     */
    async handleJoin(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.message.id;
        let data = db.fetch(`giveaway_${messageId}`);

        if (!data) {
            return interaction.editReply({ content: '❌ Bu çekiliş bulunamadı!' });
        }

        if (data.ended) {
            return interaction.editReply({ content: '❌ Bu çekiliş sona erdi!' });
        }

        const userId = interaction.user.id;

        // participants array yoksa oluştur
        if (!Array.isArray(data.participants)) data.participants = [];

        // Zaten katılmış mı? → Ayrıl
        if (data.participants.includes(userId)) {
            data.participants = data.participants.filter(id => id !== userId);
            db.set(`giveaway_${messageId}`, data);

            await this.updateMessage(interaction.message, data).catch(() => {});
            return interaction.editReply({ content: '⬅️ Çekilişten ayrıldın.' });
        }

        // Katıl
        data.participants.push(userId);
        db.set(`giveaway_${messageId}`, data);

        await this.updateMessage(interaction.message, data).catch(() => {});
        return interaction.editReply({ content: '🎉 Çekilişe katıldın! Bol şans!' });
    }

    /**
     * Mesajı güncelle (katılımcı sayısı)
     */
    async updateMessage(message, data) {
        const embed = this.createEmbed(data.prize, data.winnerCount, data.endTime, data.hostId, data.participants);

        const count = Array.isArray(data.participants) ? data.participants.length : 0;
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel(`🎉 Katıl / Ayrıl (${count})`)
                    .setStyle(ButtonStyle.Success)
            );

        await message.edit({ embeds: [embed], components: [row] }).catch(() => { });
    }

    /**
     * Çekiliş embed'i oluştur
     */
    createEmbed(prize, winnerCount, endTime, hostId, participants = []) {
        const parts = Array.isArray(participants) ? participants : [];
        const endTimestamp = Math.floor(endTime / 1000);

        return new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle('🎉 ÇEKİLİŞ!')
            .setDescription(
                `**🎁 Ödül:** ${prize}\n\n` +
                `**👥 Katılımcı:** ${parts.length} kişi\n` +
                `**🏆 Kazanan:** ${winnerCount} kişi\n` +
                `**⏰ Bitiş:** <t:${endTimestamp}:R>\n` +
                `**👤 Düzenleyen:** <@${hostId}>\n\n` +
                `*Katılmak veya ayrılmak için butona tıkla!*`
            )
            .setFooter({ text: '🎉 Luminex Çekiliş Sistemi' })
            .setTimestamp();
    }

    /**
     * Çekiliş bitir zamanlayıcısı - süre dolunca finishGiveaway ile kazanan açıklanır
     */
    scheduleEnd(client, messageId, duration) {
        if (!client) {
            console.warn('[GIVEAWAY] Client yok, süre dolunca kazanan açıklanamayacak. Bot yeniden başlatıldığında checkActiveGiveaways halleder.');
            return;
        }
        
        // Timeout'u referans olarak sakla (bellek sızıntısı önlemek için)
        const timeout = setTimeout(async () => {
            const data = db.fetch(`giveaway_${messageId}`);
            if (data && !data.ended) {
                await this.finishGiveaway(client, data);
            }
        }, duration);
        
        if (!client.giveawayTimeouts) client.giveawayTimeouts = new Map();
        client.giveawayTimeouts.set(messageId, timeout);
    }

    /**
     * Aktif çekilişleri kontrol et (bot başlatıldığında)
     */
    async checkActiveGiveaways(client) {
        const promises = [];
        client.guilds.cache.forEach(guild => {
            const activeList = db.fetch(`giveaway_active_${guild.id}`) || [];
            
            if (activeList.length === 0) return;

            activeList.forEach(messageId => {
                const data = db.fetch(`giveaway_${messageId}`);
                if (!data || data.ended) return;

                const remaining = data.endTime - Date.now();

                if (remaining <= 0) {
                    // Süresi dolmuş, bitir
                    promises.push(this.finishGiveaway(client, data));
                } else {
                    // Zamanlayıcı kur
                    const timeout = setTimeout(async () => {
                        const currentData = db.fetch(`giveaway_${messageId}`);
                        if (currentData && !currentData.ended) {
                            await this.finishGiveaway(client, currentData);
                        }
                    }, remaining);
                    
                    // Timeout'u referans olarak sakla (bellek sızıntısı önlemek için)
                    if (!client.giveawayTimeouts) client.giveawayTimeouts = new Map();
                    client.giveawayTimeouts.set(messageId, timeout);
                }
            });
        });
        
        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    /**
     * Çekilişi bitir (client ile) - mesajı günceller ve kazananları duyurur
     */
    async finishGiveaway(client, data) {
        if (!data || !data.messageId) {
            console.error('[GIVEAWAY] Geçersiz veri, işlem iptal edildi');
            return;
        }

        // Veritabanından en güncel veriyi çek (bellekteki eski olabilir)
        const freshData = db.fetch(`giveaway_${data.messageId}`);
        if (!freshData || freshData.ended) {
            console.log('[GIVEAWAY] Çekiliş zaten bitmiş veya veri yok:', data.messageId);
            return;
        }

        // Hemen ended işaretle (çift işlem önleme)
        freshData.ended = true;
        db.set(`giveaway_${data.messageId}`, freshData);

        const participants = Array.isArray(freshData.participants) ? freshData.participants : [];
        let winners = [];
        if (participants.length > 0) {
            const shuffled = [...participants].sort(() => Math.random() - 0.5);
            winners = shuffled.slice(0, Math.min(freshData.winnerCount || 1, participants.length));
        }
        freshData.winners = winners;

        try {
            const channel = await client.channels.fetch(freshData.channelId).catch(e => {
                console.error('[GIVEAWAY] Kanal fetch hatası:', e.message);
                return null;
            });
            if (!channel) {
                console.error('[GIVEAWAY] Kanal bulunamadı:', freshData.channelId);
                return;
            }

            const winnerText = winners.length > 0
                ? winners.map(id => `<@${id}>`).join(', ')
                : 'Yeterli katılımcı yok!';

            const endEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 Çekiliş Sona Erdi!')
                .setDescription(
                    `**🎁 Ödül:** ${freshData.prize}\n\n` +
                    `**🏆 Kazanan${winners.length !== 1 ? 'lar' : ''}:** ${winnerText}\n\n` +
                    `**👥 Toplam Katılımcı:** ${participants.length}`
                )
                .setFooter({ text: 'Luminex Çekiliş Sistemi' })
                .setTimestamp();

            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_ended')
                        .setLabel(`Bitti (${participants.length} katılımcı)`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

            // 1. Önce kazanan duyurusunu gönder (kanalda görünür olsun)
            if (winners.length > 0) {
                await channel.send(`🎉 **Tebrikler** ${winnerText}! **${freshData.prize}** kazandınız!`).catch(e => console.error('[GIVEAWAY] Kazanan duyurusu:', e.message));
            } else {
                await channel.send(`🎉 Çekiliş sona erdi. Yeterli katılımcı olmadığı için kazanan seçilemedi.`).catch(() => {});
            }

            // 2. Çekiliş mesajını güncelle
            const message = await channel.messages.fetch(freshData.messageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [endEmbed], components: [disabledRow] }).catch(e => console.error('[GIVEAWAY] Mesaj güncelleme:', e.message));
            }

            // 3. Aktif listeden kaldır
            db.set(`giveaway_${freshData.messageId}`, freshData);
            let activeList = db.fetch(`giveaway_active_${freshData.guildId}`) || [];
            activeList = activeList.filter(id => id !== freshData.messageId);
            db.set(`giveaway_active_${freshData.guildId}`, activeList);
            
            // 4. Geçmişe ekle
            const historyKey = `giveaway_history_${freshData.guildId}`;
            let history = db.fetch(historyKey) || [];
            history.push({ ...freshData, endedAt: Date.now() });
            if (history.length > 50) history = history.slice(-50);
            db.set(historyKey, history);

            console.log(`[GIVEAWAY] ✅ Çekiliş sona erdi: ${freshData.prize} - Kazanan: ${winnerText}`);

        } catch (e) {
            console.error('[GIVEAWAY] Bitiş hatası:', e.message, e.stack);
        }
    }

    /**
     * Süre parse (ör: "1h", "30m", "2d")
     */
    static parseDuration(str) {
        const match = str.match(/^(\d+)([smhd])$/i);
        if (!match) return null;

        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return amount * (multipliers[unit] || 60000);
    }
}

module.exports = new GiveawaySystem();
