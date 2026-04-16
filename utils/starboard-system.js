const { EmbedBuilder } = require('discord.js');
const db = require('./mongodb-helper');

/**
 * ⭐ Luminex Starboard Sistemi
 * Yıldız reaksiyonu alan mesajlar özel kanala pinlenir
 */

class StarboardSystem {
    constructor() {
        this.STAR_EMOJI = '⭐';
        this.DEFAULT_THRESHOLD = 3;
    }

    async getSettings(guildId) {
        return {
            channelId: await db.fetch(`starboard_channel_${guildId}`),
            threshold: (await db.fetch(`starboard_threshold_${guildId}`)) || this.DEFAULT_THRESHOLD,
            enabled: (await db.fetch(`starboard_enabled_${guildId}`)) || false,
        };
    }

    async setChannel(guildId, channelId) {
        await db.set(`starboard_channel_${guildId}`, channelId);
        await db.set(`starboard_enabled_${guildId}`, true);
    }

    async setThreshold(guildId, threshold) {
        await db.set(`starboard_threshold_${guildId}`, threshold);
    }

    async handleReaction(reaction, user) {
        if (reaction.emoji.name !== this.STAR_EMOJI) return;
        if (user.bot) return;

        const message = reaction.message;
        if (!message.guild) return;

        const settings = await this.getSettings(message.guild.id);
        if (!settings.enabled || !settings.channelId) return;

        // Kendi mesajına yıldız veremez
        if (message.author.id === user.id) return;

        const starCount = reaction.count || 0;
        if (starCount < settings.threshold) return;

        const starChannel = message.guild.channels.cache.get(settings.channelId);
        if (!starChannel) return;

        // Daha önce gönderilmiş mi kontrol et
        const existingId = await db.fetch(`starboard_msg_${message.id}`);

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*Metin yok*')
            .addFields(
                { name: '📌 Kaynak', value: `[Mesaja Git](${message.url})`, inline: true },
                { name: '⭐ Yıldız', value: `${starCount}`, inline: true },
                { name: '📝 Kanal', value: `<#${message.channel.id}>`, inline: true }
            )
            .setColor('#FFD700')
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            const img = message.attachments.first();
            if (img.contentType?.startsWith('image/')) {
                embed.setImage(img.url);
            }
        }

        const content = `⭐ **${starCount}** | <#${message.channel.id}>`;

        if (existingId) {
            try {
                const existing = await starChannel.messages.fetch(existingId);
                await existing.edit({ content, embeds: [embed] });
            } catch {
                const sent = await starChannel.send({ content, embeds: [embed] });
                await db.set(`starboard_msg_${message.id}`, sent.id);
            }
        } else {
            const sent = await starChannel.send({ content, embeds: [embed] });
            await db.set(`starboard_msg_${message.id}`, sent.id);
        }
    }
}

module.exports = new StarboardSystem();
