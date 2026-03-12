const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('📢 Sunucuya duyuru yapar')
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Duyurunun içeriği')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Duyurunun yapılacağı kanal')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('önem')
                .setDescription('Duyurunun öncelik seviyesi')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Düşük Öncelik', value: '1' },
                    { name: '🔵 Normal', value: '2' },
                    { name: '🟡 Orta Öncelik', value: '3' },
                    { name: '🟠 Yüksek Öncelik', value: '4' },
                    { name: '🔴 KRİTİK', value: '5' },
                )
        ),

    run: async (client, interaction) => {
        const announcement = interaction.options.getString('mesaj');
        const channel = interaction.options.getChannel('kanal');
        const importance = interaction.options.getString('önem');

        const importanceConfig = {
            '1': { color: '#57F287', emoji: '🟢', label: 'Düşük Öncelik', icon: '📗' },
            '2': { color: '#5865F2', emoji: '🔵', label: 'Normal', icon: '📘' },
            '3': { color: '#FEE75C', emoji: '🟡', label: 'Orta Öncelik', icon: '📙' },
            '4': { color: '#E67E22', emoji: '🟠', label: 'Yüksek Öncelik', icon: '📕' },
            '5': { color: '#ED4245', emoji: '🔴', label: 'KRİTİK', icon: '🚨' }
        };

        const config = importanceConfig[importance] || importanceConfig['2'];

        const announcementEmbed = {
            color: parseInt(config.color.replace('#', ''), 16),
            title: `${config.icon} Duyuru`,
            description: `
${emojis.decorations.starLine}

${config.emoji} **${config.label}**

${emojis.decorations.line}

${announcement}

${emojis.decorations.line}

${emojis.static.user} **Yetkili:** ${interaction.user.tag}
${emojis.static.clock} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>

${emojis.decorations.starLine}
            `,
            footer: {
                text: `📢 Luminex Duyuru Sistemi`,
                icon_url: client.user.displayAvatarURL()
            },
            timestamp: new Date().toISOString()
        };

        await channel.send({ embeds: [announcementEmbed] });

        const successEmbed = {
            color: 0x57F287,
            description: `${emojis.success} **Duyuru Başarıyla Gönderildi!**\n\n${emojis.static.channel} Kanal: ${channel}\n${emojis.static.info} Öncelik: ${config.emoji} ${config.label}`,
            footer: { text: "Duyuru Sistemi" },
            timestamp: new Date().toISOString()
        };

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    },
};