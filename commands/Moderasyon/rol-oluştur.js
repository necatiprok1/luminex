const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-oluştur')
        .setDescription('🎨 Yeni bir rol oluşturur')
        .addStringOption(option =>
            option.setName('isim')
                .setDescription('Rolün ismi')
                .setRequired(true)
                .setMaxLength(100))
        .addStringOption(option =>
            option.setName('renk')
                .setDescription('Rolün rengi (hex: #FF0000 veya isim: Red)')
                .setRequired(true)),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Rolleri Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        const roleName = interaction.options.getString('isim');
        const roleColor = interaction.options.getString('renk');

        try {
            const newRole = await interaction.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `${interaction.user.tag} tarafından oluşturuldu`
            });

            const embed = new EmbedBuilder()
                .setColor(roleColor)
                .setTitle(`${emojis.static.sparkles || '🎨'} Rol Oluşturuldu`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.shield} **Rol:** ${newRole}
${emojis.decorations.bullet} **İsim:** \`${roleName}\`
${emojis.decorations.bullet} **Renk:** \`${roleColor}\`
${emojis.static.user} **Oluşturan:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🎨 Rol Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nRol oluşturulamadı. Geçerli bir renk kodu girdiğinizden emin olun.\n\n${emojis.static.info} Örnek: \`#FF0000\`, \`Red\`, \`Blue\``)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
