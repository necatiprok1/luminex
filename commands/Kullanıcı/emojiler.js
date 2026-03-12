const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emojiler')
        .setDescription('🎭 Sunucuda bulunan tüm emojileri listeler.'),

    run: async (client, interaction) => {
        let animEmotes = [], staticEmotes = [];

        interaction.guild.emojis.cache.forEach((emoji) => {
            emoji.animated
                ? animEmotes.push(`<a:${emoji.name}:${emoji.id}>`)
                : staticEmotes.push(`<:${emoji.name}:${emoji.id}>`);
        });

        const totalEmojis = animEmotes.length + staticEmotes.length;
        const maxEmojis = interaction.guild.premiumTier === 0 ? 50 :
            interaction.guild.premiumTier === 1 ? 100 :
                interaction.guild.premiumTier === 2 ? 150 : 250;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emojis.static.sparkles} ${interaction.guild.name} - Emoji Galerisi`)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.chart || '📊'} **Emoji İstatistikleri**

${emojis.decorations.line}

${emojis.decorations.bullet} **Toplam:** \`${totalEmojis}/${maxEmojis}\`
${emojis.decorations.bullet} **Animasyonlu:** \`${animEmotes.length}\` ${emojis.animated.sparkle || '✨'}
${emojis.decorations.bullet} **Statik:** \`${staticEmotes.length}\` 🖼️

${emojis.decorations.starLine}
            `)
            .setTimestamp();

        if (animEmotes.length > 0) {
            const animText = animEmotes.slice(0, 50).join(' ');
            embed.addFields({
                name: `${emojis.static.fire || '🔥'} Animasyonlu Emojiler (${animEmotes.length})`,
                value: animText.length > 1024 ? animText.substring(0, 1020) + '...' : animText || 'Yok',
                inline: false
            });
        }

        if (staticEmotes.length > 0) {
            const staticText = staticEmotes.slice(0, 50).join(' ');
            embed.addFields({
                name: `🖼️ Statik Emojiler (${staticEmotes.length})`,
                value: staticText.length > 1024 ? staticText.substring(0, 1020) + '...' : staticText || 'Yok',
                inline: false
            });
        }

        embed.setFooter({
            text: `${emojis.static.info} ${interaction.user.tag} tarafından istendi`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

        interaction.reply({ embeds: [embed] });
    },
};
