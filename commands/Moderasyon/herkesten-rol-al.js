const { PermissionsBitField, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('herkesten-rol-al')
        .setDescription('👥 Sunucudaki herkesten belirli bir rol alır')
        .addRoleOption(option =>
            option
                .setName('rol')
                .setDescription('Herkesten alınacak rol')
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

        await interaction.deferReply();

        try {
            const members = await interaction.guild.members.fetch();
            let successCount = 0;
            let failCount = 0;

            for (const [, member] of members) {
                try {
                    if (member.roles.cache.has(rol.id)) {
                        await member.roles.remove(rol);
                        successCount++;
                    }
                } catch {
                    failCount++;
                }
            }

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.users || '👥'} Toplu Rol Alma`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **İşlem Tamamlandı!**

${emojis.decorations.line}

${emojis.static.shield} **Rol:** ${rol}
${emojis.static.check || '✅'} **Başarılı:** \`${successCount}\` üye
${emojis.static.cross || '❌'} **Başarısız:** \`${failCount}\` üye
${emojis.static.user} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `👥 Toplu Rol Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nKullanıcılardan rol alınamadı. Botun yetkisi yetersiz.`)
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};