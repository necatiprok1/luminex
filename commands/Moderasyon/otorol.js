const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const db = require("croxydb");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("oto-rol")
        .setDescription("⚡ Yeni üyelere otomatik rol verilmesini ayarlar")
        .addRoleOption((option) =>
            option
                .setName("rol")
                .setDescription("Otomatik verilecek rolü seçin")
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Rolleri Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const rol = interaction.options.getRole('rol');
        db.set(`otorol_${interaction.guild.id}`, rol.id);

        const successEmbed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle(`${emojis.static.sparkles} Oto-Rol Ayarlandı`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.shield} **Oto-Rol:** ${rol}
${emojis.static.user} **Ayarlayan:** ${interaction.user.tag}

${emojis.decorations.line}

${emojis.static.info} Artık sunucuya yeni katılan üyelere otomatik olarak bu rol verilecek.

${emojis.decorations.starLine}
            `)
            .setFooter({ text: `⚡ Oto-Rol Sistemi`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
    }
};
