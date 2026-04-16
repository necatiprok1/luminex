const db = require('./mongodb-helper');
const { EmbedBuilder } = require('discord.js');

/**
 * 🏆 Luminex Seviye & XP Sistemi
 * Mesaj bazlı XP kazanma, seviye atlama, liderlik tablosu
 */

class LevelSystem {
    constructor() {
        // XP Ayarları
        this.MIN_XP = 15;
        this.MAX_XP = 25;
        this.COOLDOWN = 60000; // 60 saniye (spam önleme)
        this.xpCooldowns = new Map();

        // Seviye Rolleri (sunucu başına özelleştirilebilir)
        this.DEFAULT_LEVEL_ROLES = {
            5: null,   // Seviye 5'te verilecek rol
            10: null,
            20: null,
            30: null,
            50: null
        };
    }

    /**
     * Seviye atlamak için gereken XP hesapla
     */
    xpForLevel(level) {
        return 5 * (level * level) + 50 * level + 100;
    }

    /**
     * Toplam XP'den seviye hesapla
     */
    getLevelFromXP(totalXP) {
        let level = 0;
        let remaining = totalXP;

        while (remaining >= this.xpForLevel(level)) {
            remaining -= this.xpForLevel(level);
            level++;
        }

        return { level, currentXP: remaining, neededXP: this.xpForLevel(level) };
    }

    /**
     * Kullanıcı verisini getir
     */
    async getUserData(guildId, userId) {
        const key = `xp_${guildId}_${userId}`;
        const raw = await db.fetch(key);
        if (!raw || typeof raw !== 'object') return { totalXP: 0, level: 0, messages: 0 };
        return {
            totalXP: Number(raw.totalXP) || 0,
            level: Number(raw.level) || 0,
            messages: Number(raw.messages) || 0,
            username: raw.username
        };
    }

    /**
     * XP ver ve seviye kontrol et
     * @returns {object|null} Seviye atladıysa bilgi döner
     */
    async addXP(guildId, userId, username) {
        // Cooldown kontrolü
        const cooldownKey = `${guildId}_${userId}`;
        const now = Date.now();
        const lastXP = this.xpCooldowns.get(cooldownKey) || 0;

        if (now - lastXP < this.COOLDOWN) {
            return null; // Cooldown'da, XP verme
        }

        this.xpCooldowns.set(cooldownKey, now);

        // Rastgele XP miktarı
        const xpGain = Math.floor(Math.random() * (this.MAX_XP - this.MIN_XP + 1)) + this.MIN_XP;

        // Mevcut veriyi al (eski veri formatı uyumluluğu)
        const key = `xp_${guildId}_${userId}`;
        const raw = await db.fetch(key);
        let data = raw && typeof raw === 'object'
            ? { totalXP: Number(raw.totalXP) || 0, level: Number(raw.level) || 0, messages: Number(raw.messages) || 0, username: raw.username || username }
            : { totalXP: 0, level: 0, messages: 0, username };

        const { level: oldLevel } = this.getLevelFromXP(data.totalXP);

        // XP ve mesaj sayısını güncelle
        data.totalXP += xpGain;
        data.messages = (data.messages || 0) + 1;
        data.username = username;

        // Yeni seviyeyi hesapla
        const { level: newLevel, currentXP, neededXP } = this.getLevelFromXP(data.totalXP);
        data.level = newLevel;

        // Kaydet (croxydb 0 kabul etmez - objeler sorun değil)
        await db.set(key, data);

        // Liderlik tablosu indeksini güncelle
        await this.updateLeaderboardIndex(guildId, userId, data.totalXP, username);

        // Seviye atladı mı?
        if (newLevel > oldLevel) {
            return {
                leveledUp: true,
                oldLevel,
                newLevel,
                totalXP: data.totalXP,
                currentXP,
                neededXP,
                xpGain,
                username
            };
        }

        return { leveledUp: false, xpGain };
    }

    /**
     * Liderlik tablosu indeksini güncelle
     */
    async updateLeaderboardIndex(guildId, userId, totalXP, username) {
        const key = `leaderboard_${guildId}`;
        let board = await db.fetch(key) || [];

        const existing = board.findIndex(e => String(e.userId) === String(userId));
        if (existing !== -1) {
            board[existing].totalXP = totalXP;
            board[existing].username = username;
        } else {
            board.push({ userId, totalXP, username });
        }

        // Sırala (yüksekten düşüğe)
        board.sort((a, b) => b.totalXP - a.totalXP);

        // Sadece top 100'ü tut
        board = board.slice(0, 100);

        await db.set(key, board);
    }

    /**
     * Liderlik tablosunu getir
     */
    async getLeaderboard(guildId, limit = 10) {
        const key = `leaderboard_${guildId}`;
        const board = await db.fetch(key) || [];
        // Ensure board is an array
        if (!Array.isArray(board)) {
            console.warn(`[LEVEL] Invalid leaderboard data for guild ${guildId}, resetting...`);
            await db.set(key, []);
            return [];
        }
        return board.slice(0, limit);
    }

    /**
     * Seviye atlama embed'i
     */
    getLevelUpEmbed(userId, data) {
        const progressBar = this.createProgressBar(0, data.neededXP || 100);

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${this.getLevelEmoji(data.newLevel)} Seviye Atlandı!`)
            .setDescription(
                `Tebrikler <@${userId}>! **Seviye ${data.newLevel}**'e ulaştın.\n\n` +
                `**📊 İlerleme**\n` +
                `\`[${progressBar}]\` 0%\n` +
                `\`0 / ${(data.neededXP || 100).toLocaleString()} XP\`\n\n` +
                `**📈 Özet**\n` +
                `• Önceki: Seviye ${data.oldLevel}\n` +
                `• Toplam XP: ${data.totalXP.toLocaleString()}\n` +
                `• Sonraki seviye: ${(data.neededXP || 100).toLocaleString()} XP`
            )
            .setFooter({ text: 'Luminex Seviye Sistemi' })
            .setTimestamp();
    }

    /**
     * Seviye kartı embed'i oluştur
     */
    async getProfileEmbed(userId, guildId, memberOrUser) {
        const data = await this.getUserData(guildId, userId);
        const totalXP = data.totalXP || 0;
        const messages = data.messages || 0;
        const { level, currentXP, neededXP } = this.getLevelFromXP(totalXP);
        const safeNeeded = neededXP > 0 ? neededXP : 100;
        const progressBar = this.createProgressBar(currentXP, safeNeeded);
        const percentage = Math.min(100, Math.round((currentXP / safeNeeded) * 100));

        const user = memberOrUser?.user || memberOrUser;

        // Sıralama bul
        const board = await this.getLeaderboard(guildId, 100);
        const rankIndex = board.findIndex(e => String(e.userId) === String(userId));
        const rank = rankIndex >= 0 ? rankIndex + 1 : null;

        return new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: user?.tag || data.username || 'Kullanıcı',
                iconURL: user?.displayAvatarURL?.({ dynamic: true })
            })
            .setThumbnail(user?.displayAvatarURL?.({ dynamic: true, size: 256 }))
            .setTitle(`${this.getLevelEmoji(level)} Seviye ${level}`)
            .setDescription(
                `**XP İlerlemesi**\n` +
                `\`[${progressBar}]\` **${percentage}%**\n` +
                `\`${currentXP.toLocaleString()} / ${safeNeeded.toLocaleString()} XP\`\n\n` +
                `**📊 İstatistikler**\n` +
                `• Toplam XP: **${totalXP.toLocaleString()}**\n` +
                `• Mesaj: **${messages.toLocaleString()}**\n` +
                `• Sıralama: **#${rank || '?'}**`
            )
            .setFooter({ text: 'Luminex Seviye Sistemi' })
            .setTimestamp();
    }

    /**
     * Liderlik tablosu embed'i
     */
    async getLeaderboardEmbed(guildId, guild) {
        const board = await this.getLeaderboard(guildId, 10);

        if (board.length === 0) {
            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🏆 Liderlik Tablosu')
                .setDescription('Henüz kimse XP kazanmamış. Sohbete katılarak XP kazan!')
                .setFooter({ text: 'Luminex Seviye Sistemi' })
                .setTimestamp();
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = board.map((entry, i) => {
            const { level } = this.getLevelFromXP(entry.totalXP || 0);
            const medal = medals[i] || `**${i + 1}.**`;
            const name = entry.username || 'Bilinmeyen';
            return `${medal} ${name} — Seviye **${level}** • ${(entry.totalXP || 0).toLocaleString()} XP`;
        });

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Liderlik Tablosu')
            .setDescription(lines.join('\n'))
            .setThumbnail(guild?.iconURL?.({ dynamic: true }))
            .setFooter({ text: `Top ${board.length} kullanıcı • Luminex` })
            .setTimestamp();
    }

    /**
     * İlerleme çubuğu oluştur
     */
    createProgressBar(current, max) {
        if (!max || max <= 0) return '░'.repeat(20);
        const barLength = 20;
        const filled = Math.min(barLength, Math.round((current / max) * barLength));
        const empty = barLength - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Seviyeye göre emoji
     */
    getLevelEmoji(level) {
        if (level >= 50) return '💎';
        if (level >= 40) return '👑';
        if (level >= 30) return '🔥';
        if (level >= 20) return '⭐';
        if (level >= 10) return '🌟';
        if (level >= 5) return '✨';
        return '🌱';
    }

    /**
     * Seviye rollerini kontrol et ve uygula
     */
    async checkLevelRoles(guildId, member, newLevel) {
        const levelRoles = await db.fetch(`level_roles_${guildId}`) || {};

        for (const [reqLevel, roleId] of Object.entries(levelRoles)) {
            if (newLevel >= parseInt(reqLevel) && roleId) {
                const role = member.guild.roles.cache.get(roleId);
                if (role && !member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.add(role);
                        console.log(`[LEVEL] 🎭 ${member.user.username} → ${role.name} rolü verildi (Seviye ${reqLevel})`);
                    } catch (e) {
                        console.error(`[LEVEL] Rol verilemedi:`, e.message);
                    }
                }
            }
        }
    }

    /**
     * Seviye rolü ayarla
     */
    async setLevelRole(guildId, level, roleId) {
        const key = `level_roles_${guildId}`;
        let roles = await db.fetch(key) || {};
        roles[level] = roleId;
        await db.set(key, roles);
    }
}

module.exports = new LevelSystem();
