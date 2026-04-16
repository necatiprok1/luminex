/**
 * 🔄 Discord Server State Synchronization
 * Periyodik olarak guild members, roles, channels'ı MongoDB'ye senkronize eder
 * RAG context'e dahil etmek için kullanılır
 */

const chalk = require('chalk');
const { ServerCache, LearningStats } = require('../models/GuildMemory');

class ServerStateSync {
    constructor(client) {
        this.client = client;
        this.SYNC_INTERVAL = 2 * 60 * 60 * 1000; // 2 saat
        this.syncInProgress = new Set();
        this.initialized = false;
    }

    /**
     * Sync sistemini başlat
     */
    async initialize() {
        try {
            console.log(chalk.blue('[SYNC] ⏳ Server state sync initializing...'));

            // Bot ready olduğunda ilk sync
            if (this.client.isReady()) {
                await this.syncAllGuilds();
            }

            // Periyodik sync'i başlat
            this.startPeriodicSync();

            this.initialized = true;
            console.log(chalk.green('[SYNC] ✅ Server state sync initialized'));

            return true;

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ Initialization failed: ${error.message}`));
            return false;
        }
    }

    /**
     * Periyodik sync task'ını başlat
     * @private
     */
    startPeriodicSync() {
        setInterval(async () => {
            console.log(chalk.blue('[SYNC] 🔄 Running periodic server state sync...'));
            await this.syncAllGuilds();
        }, this.SYNC_INTERVAL);

        console.log(chalk.cyan(`[SYNC] ⏰ Periodic sync scheduled every 2 hours`));
    }

    /**
     * Tüm guild'leri senkronize et
     */
    async syncAllGuilds() {
        try {
            const guilds = this.client.guilds.cache;
            console.log(chalk.cyan(`[SYNC] 🏪 Syncing ${guilds.size} guilds...`));

            let successCount = 0;
            let errorCount = 0;

            for (const [guildId, guild] of guilds) {
                try {
                    await this.syncGuild(guild);
                    successCount++;
                } catch (error) {
                    console.error(chalk.red(`[SYNC] ❌ Failed to sync ${guild.name}: ${error.message}`));
                    errorCount++;
                }
            }

            console.log(chalk.green(`[SYNC] ✅ Sync complete: ${successCount} succeeded, ${errorCount} failed`));

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ Sync all error: ${error.message}`));
        }
    }

    /**
     * Tekil guild'i senkronize et
     */
    async syncGuild(guild) {
        const guildId = guild.id;

        // Duplicate sync'i önle
        if (this.syncInProgress.has(guildId)) {
            console.warn(chalk.yellow(`[SYNC] ⚠️ Sync already in progress for ${guild.name}`));
            return;
        }

        this.syncInProgress.add(guildId);

        try {
            console.log(chalk.blue(`[SYNC] 📍 Syncing guild: ${guild.name}`));

            // Members'ı fetch et
            const members = await this.fetchMembers(guild);
            const roles = this.extractRoles(guild);
            const channels = this.extractChannels(guild);

            // Cache'e kaydet
            const cacheData = {
                guildId,
                guildName: guild.name,
                ownerId: guild.ownerId,
                memberCount: guild.memberCount,
                members,
                roles,
                channels,
                serverInfo: {
                    description: guild.description || '',
                    language: 'tr',
                    premiumTier: guild.premiumTier,
                    customEmojis: guild.emojis.cache.size
                },
                lastSync: new Date(),
                syncStatus: 'completed'
            };

            // MongoDB'ye upsert et
            await ServerCache.updateOne(
                { guildId },
                cacheData,
                { upsert: true }
            );

            console.log(chalk.cyan(`[SYNC]   ✓ Members: ${members.length}`));
            console.log(chalk.cyan(`[SYNC]   ✓ Roles: ${roles.length}`));
            console.log(chalk.cyan(`[SYNC]   ✓ Channels: ${channels.length}`));

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ Guild sync error: ${error.message}`));

            // Hata durumunu kaydet
            await ServerCache.updateOne(
                { guildId },
                { syncStatus: 'failed', lastSync: new Date() },
                { upsert: true }
            );

            throw error;

        } finally {
            this.syncInProgress.delete(guildId);
        }
    }

    /**
     * Guild members'ı fetch et (pagination desteği)
     * @private
     */
    async fetchMembers(guild) {
        try {
            // Tüm members'ı fetch et (cache kullanılır)
            const members = await guild.members.fetch({ limit: null });

            return members.map(member => ({
                userId: member.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
                roles: member.roles.cache.map(r => r.id),
                joinedAt: member.joinedAt,
                nickname: member.nickname || null,
                avatarUrl: member.user.displayAvatarURL()
            }));

        } catch (error) {
            console.error(chalk.yellow(`[SYNC] ⚠️ Failed to fetch members: ${error.message}`));
            return [];
        }
    }

    /**
     * Guild roles'ları çıkar
     * @private
     */
    extractRoles(guild) {
        return guild.roles.cache
            .filter(role => !role.managed) // Bot-managed roles'ı hariç tut
            .map(role => ({
                roleId: role.id,
                roleName: role.name,
                color: role.hexColor,
                permissions: role.permissions.toArray(),
                memberCount: role.members.size,
                position: role.position
            }));
    }

    /**
     * Guild channels'ları çıkar
     * @private
     */
    extractChannels(guild) {
        return guild.channels.cache.map(channel => ({
            channelId: channel.id,
            name: channel.name,
            type: channel.type, // 'GUILD_TEXT', 'GUILD_VOICE', etc.
            topic: channel.topic || '',
            nsfw: channel.nsfw || false,
            position: channel.position,
            parentId: channel.parentId || null
        }));
    }

    /**
     * Guild'i manuel olarak senkronize et
     */
    async syncGuildManual(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);

            if (!guild) {
                throw new Error('Guild not found');
            }

            console.log(chalk.blue(`[SYNC] 📍 Manual sync: ${guild.name}`));
            await this.syncGuild(guild);

            return {
                success: true,
                guild: guild.name,
                message: 'Guild synchronized successfully'
            };

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ Manual sync error: ${error.message}`));
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cached server info'yu getir
     */
    async getServerInfo(guildId) {
        try {
            const cache = await ServerCache.findOne({ guildId }).lean();

            if (!cache) {
                return {
                    success: false,
                    error: 'No cache found for guild'
                };
            }

            return {
                success: true,
                guildName: cache.guildName,
                memberCount: cache.memberCount,
                roleCount: cache.roles.length,
                channelCount: cache.channels.length,
                lastSync: cache.lastSync,
                syncStatus: cache.syncStatus
            };

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ Get info error: ${error.message}`));
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Server cache'i RAG context'e hazırla
     */
    async prepareRAGContext(guildId) {
        try {
            const cache = await ServerCache.findOne({ guildId }).lean();

            if (!cache) {
                return '';
            }

            let context = '🏤 **SUNUCU BÖLÜTÜnde CİMAAT ALINAN VERİLER:**\n';
            context += `Sunucu: ${cache.guildName}\n`;
            context += `Üye Sayısı: ${cache.memberCount}\n`;
            context += `Rol Sayısı: ${cache.roles.length}\n`;
            context += `Kanal Sayısı: ${cache.channels.length}\n\n`;

            // Ana rolleri listele
            context += '**Ana Roller:**\n';
            cache.roles
                .filter(r => r.memberCount > 5)
                .sort((a, b) => b.memberCount - a.memberCount)
                .slice(0, 5)
                .forEach(role => {
                    context += `  - ${role.roleName} (${role.memberCount} üye)\n`;
                });

            // Aktif channels'ları listele
            context += '\n**Ana Kanallar:**\n';
            cache.channels
                .filter(c => c.type === 0) // Text channels only
                .slice(0, 5)
                .forEach(channel => {
                    context += `  - #${channel.name} (${channel.topic || 'Açıklaması yok'})\n`;
                });

            return context;

        } catch (error) {
            console.error(chalk.red(`[SYNC] ❌ RAG context error: ${error.message}`));
            return '';
        }
    }

    /**
     * Sistem durumunu getir
     */
    getStatus() {
        return {
            initialized: this.initialized,
            syncInterval: '2 hours',
            syncInProgress: this.syncInProgress.size,
            totalGuilds: this.client.guilds.cache.size
        };
    }
}

/**
 * Module export - client ile initialize edilmeli
 */
module.exports = (client) => new ServerStateSync(client);
