const { EmbedBuilder } = require('discord.js');
const { ModLog } = require('../models/GuildMemory');
const mongoose = require('mongoose');
const db = require('./mongodb-helper');

/**
 * 📋 Luminex Log Sistemi
 * Sunucu olaylarını kaydeder ve log kanalına gönderir
 */

class LogSystem {
    /**
     * Log kanalını getir
     */
    async getLogChannel(guild) {
        const logChannelId = await db.fetch(`log_channel_${guild.id}`);
        if (!logChannelId) return null;
        return guild.channels.cache.get(logChannelId);
    }

    /**
     * Log kanalı ayarla
     */
    async setLogChannel(guildId, channelId) {
        await db.set(`log_channel_${guildId}`, channelId);
    }

    /**
     * Log sistemi aktif mi?
     */
    async isActive(guildId) {
        const value = await db.fetch(`module_${guildId}_log-sistemi`);
        return value === true;
    }

    /**
     * Genel log gönder
     */
    async sendLog(guild, embed) {
        if (!(await this.isActive(guild.id))) return;
        const channel = await this.getLogChannel(guild);
        if (!channel) return;

        try {
            await channel.send({ embeds: [embed] });
        } catch (e) {
            console.error('[LOG] Log gönderilemedi:', e.message);
        }
    }

    /**
     * Alias for sendLog (voiceStateUpdate.js compatibility)
     */
    async send(guild, embed) {
        return this.sendLog(guild, embed);
    }

    /**
     * Mesaj silme logu
     */
    async logMessageDelete(message) {
        if (!message.guild || message.author?.bot) return;

        const content = message.content?.slice(0, 1020) || '*İçerik yok veya embed*';
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Mesaj Silindi')
            .setDescription(`Bir mesaj **silindi**.`)
            .addFields(
                { name: '👤 Kullanıcı', value: `${message.author} (\`${message.author.tag}\`)`, inline: true },
                { name: '📝 Kanal', value: `${message.channel}`, inline: true },
                { name: '💬 İçerik', value: content }
            )
            .setFooter({ text: `ID: ${message.author.id}` })
            .setTimestamp();

        if (message.attachments.size > 0) {
            const attNames = message.attachments.map(a => a.name).join(', ');
            embed.addFields({
                name: '📎 Ekler',
                value: attNames.length > 1024 ? attNames.slice(0, 1020) + '...' : attNames
            });
        }

        // MongoDB save
        if (mongoose.connection.readyState === 1) {
            try {
                await ModLog.create({
                    guildId: message.guild.id,
                    action: 'Mesaj Silme',
                    moderatorId: message.author.id,
                    moderatorTag: message.author.tag,
                    content: message.content || '*İçerik yok*',
                    timestamp: new Date()
                });
            } catch (err) { }
        }

        await this.sendLog(message.guild, embed);
    }

    /**
     * Mesaj düzenleme logu
     */
    async logMessageUpdate(oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const oldContent = oldMessage.content?.slice(0, 500) || '*Boş*';
        const newContent = newMessage.content?.slice(0, 500) || '*Boş*';
        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('✏️ Mesaj Düzenlendi')
            .setDescription('Bir mesaj **düzenlendi**.')
            .addFields(
                { name: '👤 Kullanıcı', value: `${oldMessage.author} (\`${oldMessage.author.tag}\`)`, inline: true },
                { name: '📝 Kanal', value: `${oldMessage.channel}`, inline: true },
                { name: '📤 Eski', value: oldContent },
                { name: '📥 Yeni', value: newContent }
            )
            .setFooter({ text: `Mesaj ID: ${oldMessage.id}` })
            .setTimestamp();

        await this.sendLog(oldMessage.guild, embed);
    }

    /**
     * Üye katılma logu (sadece GuildMemberAdd event'inde çağrılır → "sunucuya girdi")
     */
    async logMemberJoin(member) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📥 Sunucuya Üye Katıldı')
            .setDescription(`**${member.user.tag}** sunucumuza **katıldı** (giriş yaptı).`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member} (\`${member.user.tag}\`)`, inline: true },
                { name: '📅 Hesap Yaşı', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Toplam Üye', value: `\`${member.guild.memberCount}\``, inline: true }
            )
            .setFooter({ text: `Katılım • ID: ${member.id}` })
            .setTimestamp();

        if (isNewAccount) {
            embed.addFields({ name: '⚠️ Uyarı', value: 'Yeni hesap (7 günden az)' });
        }

        await this.sendLog(member.guild, embed);
    }

    /**
     * Üye ayrılma logu (sadece GuildMemberRemove event'inde çağrılır → "sunucudan ayrıldı")
     */
    async logMemberRemove(member) {
        const roleList = member.roles?.cache
            ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(', ')
            : '';
        const roles = (roleList && roleList.length > 0) ? roleList : 'Rol yok';

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('📤 Sunucudan Üye Ayrıldı')
            .setDescription(`**${member.user.tag}** sunucudan **ayrıldı** (çıkış yaptı).`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                { name: '📅 Katılım Tarihi', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Bilinmiyor', inline: true },
                { name: '👥 Kalan Üye', value: `\`${member.guild.memberCount}\``, inline: true },
                { name: '🎭 Rolleri', value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles }
            )
            .setFooter({ text: `Ayrılış • ID: ${member.id}` })
            .setTimestamp();

        await this.sendLog(member.guild, embed);
    }

    /**
     * Moderasyon logu
     */
    async logModeration(guild, action, moderator, target, reason) {
        const actionColors = {
            ban: '#ED4245', kick: '#E67E22', timeout: '#FEE75C',
            warn: '#FEE75C', unban: '#57F287'
        };
        const actionEmojis = {
            ban: '🔨', kick: '👢', timeout: '⏰',
            warn: '⚠️', unban: '🔓'
        };

        const embed = new EmbedBuilder()
            .setColor(actionColors[action] || '#ED4245')
            .setTitle(`${actionEmojis[action] || '🛡️'} Moderasyon: ${action.toUpperCase()}`)
            .addFields(
                { name: '👮 Moderatör', value: `${moderator}`, inline: true },
                { name: '🎯 Hedef', value: `${target}`, inline: true },
                { name: '📝 Sebep', value: reason || 'Belirtilmedi' }
            )
            .setTimestamp();

        // MongoDB save
        if (mongoose.connection.readyState === 1) {
            try {
                await ModLog.create({
                    guildId: guild.id,
                    action: action.toUpperCase(),
                    moderatorId: moderator.id,
                    moderatorTag: moderator.tag || moderator.username,
                    targetId: target.id,
                    targetTag: target.tag || target.username,
                    reason: reason || 'Belirtilmedi',
                    timestamp: new Date()
                });
            } catch (err) { }
        }

        await this.sendLog(guild, embed);
    }
}

module.exports = new LogSystem();
