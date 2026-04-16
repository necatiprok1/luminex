const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const db = require('./mongodb-helper');

/**
 * 🛡️ Luminex Anti-Raid / Anti-Nuke Sistemi
 * Toplu ban/kick/kanal silme tespiti & otomatik kilitleme
 */

class AntiRaidSystem {
    constructor() {
        // Eşik değerleri (belirli süre içinde kaç işlem yapılırsa tetiklenir)
        this.THRESHOLDS = {
            joins: { count: 10, window: 10000 },        // 10 saniyede 10 katılım
            bans: { count: 3, window: 30000 },           // 30 saniyede 3 ban
            kicks: { count: 3, window: 30000 },          // 30 saniyede 3 kick
            channelDeletes: { count: 2, window: 30000 }, // 30 saniyede 2 kanal silme
            roleDeletes: { count: 2, window: 30000 },    // 30 saniyede 2 rol silme
        };

        // Olay kayıtları { guildId: { type: [timestamp, ...] } }
        this.events = new Map();
    }

    async getSettings(guildId) {
        return {
            enabled: (await db.fetch(`antiraid_enabled_${guildId}`)) || false,
            logChannelId: await db.fetch(`antiraid_log_${guildId}`),
            lockdownActive: (await db.fetch(`antiraid_lockdown_${guildId}`)) || false,
        };
    }

    async enable(guildId, logChannelId) {
        await db.set(`antiraid_enabled_${guildId}`, true);
        if (logChannelId) await db.set(`antiraid_log_${guildId}`, logChannelId);
    }

    async disable(guildId) {
        await db.set(`antiraid_enabled_${guildId}`, false);
        await db.set(`antiraid_lockdown_${guildId}`, false);
    }

    /**
     * Olay kaydet ve eşik kontrolü yap
     */
    recordEvent(guildId, type) {
        const key = `${guildId}_${type}`;
        if (!this.events.has(key)) this.events.set(key, []);

        const now = Date.now();
        const events = this.events.get(key);
        events.push(now);

        // Pencere dışındaki eski olayları temizle
        const threshold = this.THRESHOLDS[type];
        if (!threshold) return false;

        const recent = events.filter(t => now - t < threshold.window);
        this.events.set(key, recent);

        return recent.length >= threshold.count;
    }

    /**
     * Sunucu kilitleme (tüm kanallarda mesaj gönderimi engelle)
     */
    async lockdown(guild, reason) {
        const settings = await this.getSettings(guild.id);
        if (settings.lockdownActive) return;

        await db.set(`antiraid_lockdown_${guild.id}`, true);

        const channels = guild.channels.cache.filter(c => c.isTextBased());
        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: false,
                }, { reason: `[Anti-Raid] ${reason}` });
            } catch {}
        }

        // Log gönder
        if (settings.logChannelId) {
            const logChannel = guild.channels.cache.get(settings.logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🚨 RAID TESPİT EDİLDİ — SUNUCU KİLİTLENDİ')
                    .setDescription(`**Sebep:** ${reason}\n\n⚠️ Tüm kanallarda mesaj gönderimi devre dışı bırakıldı.\nKilidi açmak için: \`/anti-raid kilidi-aç\``)
                    .setColor('#FF0000')
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    }

    /**
     * Kilidi aç
     */
    async unlockdown(guild) {
        await db.set(`antiraid_lockdown_${guild.id}`, false);

        const channels = guild.channels.cache.filter(c => c.isTextBased());
        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: null,
                }, { reason: '[Anti-Raid] Kilit açıldı' });
            } catch {}
        }
    }

    /**
     * Toplu katılım kontrolü
     */
    async handleMemberJoin(member) {
        const settings = await this.getSettings(member.guild.id);
        if (!settings.enabled) return;

        const triggered = this.recordEvent(member.guild.id, 'joins');
        if (triggered) {
            await this.lockdown(member.guild, `Toplu katılım tespit edildi (${this.THRESHOLDS.joins.count}+ üye ${this.THRESHOLDS.joins.window / 1000}s içinde)`);
        }
    }

    /**
     * Toplu ban kontrolü
     */
    async handleBan(ban) {
        const settings = await this.getSettings(ban.guild.id);
        if (!settings.enabled) return;

        const triggered = this.recordEvent(ban.guild.id, 'bans');
        if (triggered) {
            await this.lockdown(ban.guild, `Toplu ban tespit edildi (${this.THRESHOLDS.bans.count}+ ban ${this.THRESHOLDS.bans.window / 1000}s içinde)`);

            // Saldırganın yetkisini al
            try {
                const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
                const entry = auditLogs.entries.first();
                if (entry && entry.executor && !entry.executor.bot) {
                    const attacker = await ban.guild.members.fetch(entry.executor.id);
                    if (attacker && attacker.manageable) {
                        await attacker.roles.set([], '[Anti-Raid] Toplu ban saldırısı');
                    }
                }
            } catch {}
        }
    }

    /**
     * Kanal silme kontrolü
     */
    async handleChannelDelete(channel) {
        if (!channel.guild) return;
        const settings = await this.getSettings(channel.guild.id);
        if (!settings.enabled) return;

        const triggered = this.recordEvent(channel.guild.id, 'channelDeletes');
        if (triggered) {
            await this.lockdown(channel.guild, `Toplu kanal silme tespit edildi`);
        }
    }

    /**
     * Rol silme kontrolü
     */
    async handleRoleDelete(role) {
        const settings = await this.getSettings(role.guild.id);
        if (!settings.enabled) return;

        const triggered = this.recordEvent(role.guild.id, 'roleDeletes');
        if (triggered) {
            await this.lockdown(role.guild, `Toplu rol silme tespit edildi`);
        }
    }
}

module.exports = new AntiRaidSystem();
