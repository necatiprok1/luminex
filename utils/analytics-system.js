const db = require('./mongodb-helper');
const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

let Activity;
try {
    const memory = require('../models/GuildMemory');
    Activity = memory.Activity;
} catch (e) {
    console.error('[ANALYTICS] Activity model okunamadı', e.message);
}

/**
 * 📈 Luminex Analitik Sistemi
 * Komut kullanımı, mesaj istatistikleri, üye aktivitesi
 */

class AnalyticsSystem {
    /**
     * Komut kullanımını kaydet
     */
    async trackCommand(interaction) {
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;
        const commandName = interaction.commandName;
        const userId = interaction.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Global komut sayacı
        const globalKey = `analytics_cmd_${guildId}_${commandName}`;
        const currentGlobal = (await db.fetch(globalKey)) || 0;
        await db.set(globalKey, currentGlobal + 1);

        // Günlük komut sayacı
        const dailyKey = `analytics_daily_${guildId}_${today}`;
        const daily = (await db.fetch(dailyKey)) || {};
        daily[commandName] = (daily[commandName] || 0) + 1;
        daily.__total = (daily.__total || 0) + 1;
        await db.set(dailyKey, daily);

        // Kullanıcı bazlı
        const userKey = `analytics_user_${guildId}_${userId}`;
        const currentUser = (await db.fetch(userKey)) || 0;
        await db.set(userKey, currentUser + 1);
    }

    /**
     * Etkileşim kaydet (Button, Select vb)
     */
    async trackInteraction(interaction) {
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `analytics_interactions_${guildId}_${today}`;
        const current = (await db.fetch(dailyKey)) || 0;
        await db.set(dailyKey, current + 1);
    }

    /**
     * Mesaj aktivitesi kaydet
     */
    async trackMessage(message) {
        if (!message.guild || !message.channel) return;
        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const today = new Date().toISOString().split('T')[0];

        // Key-value stat update
        const key = `analytics_msgs_${guildId}_${today}`;
        const data = (await db.fetch(key)) || { total: 0, channels: {} };
        data.total++;
        data.channels[channelId] = (data.channels[channelId] || 0) + 1;
        await db.set(key, data);

        // MongoDB Activity update for dashboard
        if (mongoose.connection.readyState === 1 && Activity) {
            try {
                await Activity.findOneAndUpdate(
                    { guildId, channelId },
                    { 
                        $inc: { count: 1 }, 
                        $set: { channelName: message.channel.name, lastActive: Date.now() } 
                    },
                    { upsert: true }
                );
            } catch (e) {
                console.warn('[ANALYTICS] Activity MongoDB güncelleme hatası:', e.message);
            }
        }
    }

    /**
     * Üye katılım/ayrılma kaydet
     */
    async trackMemberFlow(guildId, type) {
        const today = new Date().toISOString().split('T')[0];
        const key = `analytics_members_${guildId}_${today}`;
        const data = (await db.fetch(key)) || { joins: 0, leaves: 0 };
        data[type] = (data[type] || 0) + 1;
        await db.set(key, data);
    }

    /**
     * En çok kullanılan komutlar (Top 10)
     */
    async getTopCommands(guildId) {
        const commands = {};
        // Son 30 gün — parallel fetch
        const fetchPromises = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const day = date.toISOString().split('T')[0];
            fetchPromises.push(
                db.fetch(`analytics_daily_${guildId}_${day}`).then(daily => daily || {})
            );
        }

        const results = await Promise.all(fetchPromises);
        for (const daily of results) {
            for (const [cmd, count] of Object.entries(daily)) {
                if (cmd === '__total') continue;
                commands[cmd] = (commands[cmd] || 0) + count;
            }
        }

        return Object.entries(commands)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }

    /**
     * Son 7 günün aktivite özeti
     */
    async getWeeklyOverview(guildId) {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const day = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });

            const msgs = (await db.fetch(`analytics_msgs_${guildId}_${day}`)) || { total: 0 };
            const members = (await db.fetch(`analytics_members_${guildId}_${day}`)) || { joins: 0, leaves: 0 };
            const cmds = (await db.fetch(`analytics_daily_${guildId}_${day}`)) || {};

            days.push({
                date: day,
                dayName,
                messages: msgs.total || 0,
                commands: cmds.__total || 0,
                joins: members.joins || 0,
                leaves: members.leaves || 0,
            });
        }
        return days;
    }

    /**
     * Aktivite embed'i oluştur
     */
    async createOverviewEmbed(guildId, guild) {
        const weekly = await this.getWeeklyOverview(guildId);
        const topCmds = await this.getTopCommands(guildId);

        const totalMsgs = weekly.reduce((s, d) => s + d.messages, 0);
        const totalCmds = weekly.reduce((s, d) => s + d.commands, 0);
        const totalJoins = weekly.reduce((s, d) => s + d.joins, 0);
        const totalLeaves = weekly.reduce((s, d) => s + d.leaves, 0);

        // Basit çubuk grafik
        const maxMsg = Math.max(...weekly.map(d => d.messages), 1);
        const chart = weekly.map(d => {
            const bars = Math.round((d.messages / maxMsg) * 10);
            return `\`${d.dayName}\` ${'█'.repeat(bars)}${'░'.repeat(10 - bars)} ${d.messages}`;
        }).join('\n');

        const topCmdStr = topCmds.length > 0
            ? topCmds.map(([cmd, count], i) => `\`${i + 1}.\` **/${cmd}** — ${count} kullanım`).join('\n')
            : '*Henüz veri yok*';

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} — Haftalık Rapor`)
            .addFields(
                { name: '📨 Toplam Mesaj', value: `${totalMsgs}`, inline: true },
                { name: '🎮 Komut Kullanım', value: `${totalCmds}`, inline: true },
                { name: '👥 Üye Akışı', value: `+${totalJoins} / -${totalLeaves}`, inline: true },
                { name: '📈 Mesaj Grafiği (7 Gün)', value: chart },
                { name: '🏆 En Popüler Komutlar', value: topCmdStr },
            )
            .setColor('#5865F2')
            .setTimestamp();

        return embed;
    }
}

module.exports = new AnalyticsSystem();
