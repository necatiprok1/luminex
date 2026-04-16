const { PermissionsBitField, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('👥 Bir kullanıcıya rol verir')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Rol verilecek kullanıcıyı seçin')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('rol')
                .setDescription('Verilecek rolü seçin')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Rolleri Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        const rol = interaction.options.getRole('rol');
        const user = interaction.options.getMember('user');

        try {
            await interaction.guild.members.cache.get(user.id).roles.add(rol);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.success} Rol Verildi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${user}
${emojis.static.shield} **Verilen Rol:** ${rol}
${emojis.static.key} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `👥 Rol Yönetim Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nKullanıcıya rol verilemedi. Botun yetkisi yetersiz olabilir.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
