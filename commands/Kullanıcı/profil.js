const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const levelSystem = require("../../utils/level-system");
const economy = require("../../utils/economy-system");
const db = require("croxydb");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profil")
        .setDescription("👤 Detaylı profil kartını görüntüle.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Başka bir kullanıcının profiline bak")
                .setRequired(false)
        ),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id) ||
            await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const guildId = interaction.guild.id;
        const userId = targetUser.id;

        // Verileri topla
        const levelData = levelSystem.getUserData(guildId, userId);
        const { level, currentXP, neededXP } = levelSystem.getLevelFromXP(levelData.totalXP);
        const balance = economy.getBalance(guildId, userId);
        const warnings = (db.fetch(`warnings_${guildId}_${userId}`) || []).length;
        const streak = db.fetch(`eco_streak_${guildId}_${userId}`) || 0;
        const purchases = (db.fetch(`eco_purchases_${guildId}_${userId}`) || []).length;

        // Sıralama
        const board = levelSystem.getLeaderboard(guildId, 100);
        const rankIdx = board.findIndex(e => String(e.userId) === String(userId));
        const rank = rankIdx >= 0 ? rankIdx + 1 : null;

        // Rozetler
        const badges = [];
        if (level >= 50) badges.push('💎 Elmas');
        else if (level >= 30) badges.push('🔥 Ateş');
        else if (level >= 10) badges.push('⭐ Yıldız');
        if (streak >= 7) badges.push('🔥 Haftalık Streak');
        if (streak >= 30) badges.push('👑 Aylık Streak');
        if (balance >= 10000) badges.push('💰 Zengin');
        if (purchases >= 5) badges.push('🛒 Koleksiyoncu');
        if (warnings === 0) badges.push('😇 Temiz Sicil');

        // Durum
        const status = member?.presence?.status || 'offline';
        const statusMap = {
            online: '🟢 Çevrimiçi',
            idle: '🟡 Boşta',
            dnd: '🔴 Rahatsız Etmeyin',
            offline: '⚫ Çevrimdışı'
        };

        const safeNeeded = neededXP > 0 ? neededXP : 100;
        const progressBar = levelSystem.createProgressBar(currentXP, safeNeeded);
        const percentage = Math.min(100, Math.round((currentXP / safeNeeded) * 100));

        // Roller
        const roles = member?.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 8)
            .join(' ') || 'Rol yok';

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || '#5865F2')
            .setAuthor({
                name: targetUser.tag,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(
                `${statusMap[status]}\n\n` +
                `━━━━━ **📊 Seviye** ━━━━━\n` +
                `${levelSystem.getLevelEmoji(level)} **Seviye ${level}** • #${rank ?? '?'}\n` +
                `\`[${progressBar}]\` **${percentage}%**\n` +
                `\`${currentXP.toLocaleString()} / ${safeNeeded.toLocaleString()} XP\`\n` +
                `💬 Mesaj: \`${levelData.messages.toLocaleString()}\`\n\n` +

                `━━━━━ **💰 Ekonomi** ━━━━━\n` +
                `💎 Bakiye: \`${balance.toLocaleString()}\`\n` +
                `🔥 Streak: \`${streak}\` gün\n\n` +

                (badges.length > 0 ? `━━━━━ **🏅 Rozetler** ━━━━━\n${badges.join(' • ')}\n\n` : '') +

                `━━━━━ **🎭 Roller** ━━━━━\n` +
                `${roles}\n\n` +

                `━━━━━ **📋 Bilgiler** ━━━━━\n` +
                `📅 Katılım: ${member?.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Bilinmiyor'}\n` +
                `🆔 ID: \`${userId}\`\n` +
                `⚠️ Uyarı: \`${warnings}/5\``
            )
            .setFooter({ text: '👤 Luminex Profil Sistemi' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
