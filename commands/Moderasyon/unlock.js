const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Belirtilen kanalın kilidini açar')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kilidi açılacak kanal')
                .setRequired(true)),
    run: async (client, interaction) => {
        const channel = interaction.options.getChannel('kanal');
        const permissionOverwrite = { SendMessages: true };

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, permissionOverwrite);

            const unlockEmbed = {
                color: 0x57F287,
                title: `${emojis.static.unlock} Kanal Kilidi Açıldı`,
                description: `
${emojis.decorations.starLine}

${emojis.success} **İşlem Başarılı!**

${emojis.decorations.line}

${emojis.static.channel} **Kanal:** ${channel}
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}
${emojis.static.clock} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.line}

${emojis.static.sparkles} Artık bu kanalda üyeler mesaj gönderebilir.

${emojis.decorations.starLine}
                `,
                footer: {
                    text: `🔓 Kanal Kilitleme Sistemi`,
                    icon_url: client.user.displayAvatarURL()
                },
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [unlockEmbed] });
        } catch (error) {
            const errorEmbed = {
                color: 0xED4245,
                description: `${emojis.error} **Hata!**\n\nKanal kilidi açılırken bir hata oluştu.\n\n\`\`\`${error.message}\`\`\``,
                timestamp: new Date().toISOString()
            };
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};