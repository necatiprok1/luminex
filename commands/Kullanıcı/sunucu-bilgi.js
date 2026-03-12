const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

const getServerInfo = (server) => {
    const serverSize = server.memberCount;
    const botCount = server.members.cache.filter(m => m.user.bot).size;
    const activeMembers = server.members.cache.filter(member => member.presence && (member.presence.status != "offline")).size;
    const owner = server.members.cache.get(server.ownerId);
    const roleCount = server.roles.cache.size;
    const channelCount = server.channels.cache.size;
    const emojiCount = server.emojis.cache.size;
    const verificationLevel = server.verificationLevel;
    const boostLevel = server.premiumTier;
    const boostCount = server.premiumSubscriptionCount;

    return {
        serverSize, botCount, activeMembers, owner, roleCount,
        channelCount, emojiCount, verificationLevel, boostLevel, boostCount
    };
};

const checkDays = (date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    return days + " gün önce";
};

const getVerificationEmoji = (level) => {
    const levels = { 0: '⚪', 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' };
    return levels[level] || '⚪';
};

const getBoostEmoji = (tier) => {
    const tiers = { 0: '⬜', 1: '🟪', 2: '💜', 3: '💎' };
    return tiers[tier] || '⬜';
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sunucu-bilgi")
        .setDescription("🏰 Sunucunun detaylı bilgilerini gösterir."),

    run: async (client, interaction) => {
        const server = interaction.guild;
        const { serverSize, botCount, activeMembers, owner, roleCount, channelCount, emojiCount, verificationLevel, boostLevel, boostCount } = getServerInfo(server);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: server.name,
                iconURL: server.iconURL({ dynamic: true })
            })
            .setThumbnail(server.iconURL({ dynamic: true, size: 512 }))
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.sparkles} **Sunucu Bilgileri**

${emojis.decorations.starLine}
            `)
            .addFields(
                {
                    name: `${emojis.static.info || 'ℹ️'} Genel Bilgiler`,
                    value: `
${emojis.decorations.bullet} **İsim:** ${server.name}
${emojis.decorations.bullet} **ID:** \`${server.id}\`
${emojis.decorations.bullet} **Sahip:** ${owner.user.tag}
${emojis.decorations.bullet} **Kuruluş:** ${checkDays(server.createdAt)}
                    `,
                    inline: true
                },
                {
                    name: `${emojis.static.users || '👥'} Üye İstatistikleri`,
                    value: `
${emojis.decorations.bullet} **Toplam:** \`${serverSize}\`
${emojis.decorations.bullet} **İnsan:** \`${serverSize - botCount}\`
${emojis.decorations.bullet} **Bot:** \`${botCount}\`
${emojis.decorations.bullet} **Aktif:** \`${activeMembers}\`
                    `,
                    inline: true
                },
                {
                    name: `${emojis.static.channel || '💬'} Kanal & Rol`,
                    value: `
${emojis.decorations.bullet} **Kanallar:** \`${channelCount}\`
${emojis.decorations.bullet} **Roller:** \`${roleCount}\`
${emojis.decorations.bullet} **Emojiler:** \`${emojiCount}\`
                    `,
                    inline: true
                },
                {
                    name: `${emojis.static.shield || '🛡️'} Güvenlik & Boost`,
                    value: `
${emojis.decorations.bullet} **Doğrulama:** ${getVerificationEmoji(verificationLevel)} Seviye ${verificationLevel}
${emojis.decorations.bullet} **Boost:** ${getBoostEmoji(boostLevel)} Seviye ${boostLevel}
${emojis.decorations.bullet} **Boost Sayısı:** \`${boostCount}\` 💎
                    `,
                    inline: false
                }
            )
            .setFooter({
                text: `${emojis.static.user} ${interaction.user.tag} tarafından istendi`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        if (server.banner) {
            embed.setImage(server.bannerURL({ size: 1024 }));
        }

        interaction.reply({ embeds: [embed] });
    },
};
