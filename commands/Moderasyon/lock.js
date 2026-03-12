const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 Belirtilen kanalı kilitler')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Kilitlenecek kanal')
                .setRequired(true)),
    run: async (client, interaction) => {
        const channel = interaction.options.getChannel('channel');
        const permissionOverwrite = { SendMessages: false };

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, permissionOverwrite);

            const lockEmbed = {
                color: 0xED4245,
                title: `${emojis.static.lock} Kanal Kilitlendi`,
                description: `
${emojis.decorations.starLine}

${emojis.success} **İşlem Başarılı!**

${emojis.decorations.line}

${emojis.static.channel} **Kanal:** ${channel}
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}
${emojis.static.clock} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.line}

${emojis.static.warning} Artık bu kanalda üyeler mesaj gönderemez.

${emojis.decorations.starLine}
                `,
                footer: {
                    text: `🔒 Kanal Kilitleme Sistemi`,
                    icon_url: client.user.displayAvatarURL()
                },
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [lockEmbed] });
        } catch (error) {
            const errorEmbed = {
                color: 0xED4245,
                description: `${emojis.error} **Hata!**\n\nKanal kilitlenirken bir hata oluştu.\n\n\`\`\`${error.message}\`\`\``,
                timestamp: new Date().toISOString()
            };
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};