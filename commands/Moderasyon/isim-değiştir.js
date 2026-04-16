const { PermissionsBitField, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('isim-degistir')
        .setDescription('📝 Bir kullanıcının sunucu takma adını değiştirir')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Takma adı değiştirilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('isim')
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
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        const yeniIsim = interaction.options.getString('isim');
        const user = interaction.options.getMember('user');
        const eskiIsim = user.nickname || user.user.username;

        try {
            await user.setNickname(yeniIsim);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.sparkles || '📝'} İsim Değiştirildi`)
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${user}
${emojis.decorations.bullet} **Eski İsim:** \`${eskiIsim}\`
${emojis.decorations.bullet} **Yeni İsim:** \`${yeniIsim}\`
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `📝 İsim Değiştirme Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nKullanıcının ismi değiştirilemedi. Botun yetkisi yetersiz olabilir.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
