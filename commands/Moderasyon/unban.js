const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 Yasaklanmış bir kullanıcının yasağını kaldırır')
        .addStringOption(option =>
            option
                .setName('id')
                .setDescription('Yasağı kaldırılacak kullanıcının ID\'si')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Yasağın kaldırılma sebebi')
                .setRequired(false)
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Üyeleri Yasakla yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const userId = interaction.options.getString('id');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        try {
            await interaction.guild.members.unban(userId, reason);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.unlock} Yasak Kaldırıldı`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.key} **Kullanıcı ID:** \`${userId}\`
${emojis.static.info} **Sebep:** ${reason}
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}
${emojis.static.clock} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🔓 Yasak Kaldırma Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nYeterli yetkim yok veya böyle bir yasaklanmış kullanıcı bulunamadı.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
