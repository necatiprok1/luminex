const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Bir kullanıcının avatarını gösterir')
        .addUserOption(option =>
            option
                .setName('kullanıcı')
                .setDescription('Avatar görmek istediğiniz kullanıcı')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const member = interaction.options.getMember('kullanıcı');
        const avatarUrl = member.user.displayAvatarURL({ size: 4096, dynamic: true });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('PNG')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🖼️')
                    .setURL(member.user.displayAvatarURL({ size: 4096, format: "png" })),
                new ButtonBuilder()
                    .setLabel('JPG')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('📷')
                    .setURL(member.user.displayAvatarURL({ size: 4096, format: "jpg" })),
                new ButtonBuilder()
                    .setLabel('WEBP')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐')
                    .setURL(member.user.displayAvatarURL({ size: 4096, format: "webp" })),
                new ButtonBuilder()
                    .setLabel('GIF')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('✨')
                    .setURL(member.user.displayAvatarURL({ size: 4096, format: "gif", dynamic: true }))
            );

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: `${member.user.tag}`,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`${emojis.static.sparkles || '✨'} Avatar Görüntüleyici`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.user} **Kullanıcı:** ${member.user.tag}
${emojis.static.link} **[Tam Boyut Aç](${avatarUrl})**

${emojis.decorations.line}

${emojis.static.info} Farklı formatları indirmek için aşağıdaki butonları kullanın.

${emojis.decorations.starLine}
            `)
            .setImage(avatarUrl)
            .setFooter({
                text: `${emojis.static.camera || '📷'} ${interaction.user.tag} tarafından istendi`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        interaction.reply({ embeds: [embed], components: [row] });
    },
};
