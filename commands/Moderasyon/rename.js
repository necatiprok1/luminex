const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('📝 Bir kullanıcının sunucu takma adını değiştirir')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Takma adı değiştirilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('yeni_ad')
                .setDescription('Yeni takma ad')
                .setRequired(true)
                .setMaxLength(32)
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Kullanıcı Adlarını Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const user = interaction.options.getUser('kullanıcı');
        const newName = interaction.options.getString('yeni_ad');
        const member = interaction.guild.members.cache.get(user.id);
        const oldName = member.nickname || user.username;

        try {
            await member.setNickname(newName);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.sparkles || '🎉'} Takma Ad Güncellendi!`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${user.tag}
${emojis.decorations.bullet} **Eski Ad:** \`${oldName}\`
${emojis.decorations.bullet} **Yeni Ad:** \`${newName}\`

${emojis.decorations.starLine}
                `)
                .setFooter({
                    text: `📝 ${interaction.user.tag} tarafından değiştirildi`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nTakma ad değiştirilemedi. Botun yetkisi yetersiz olabilir.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
