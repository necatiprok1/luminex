const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hızlı-mod')
        .setDescription('🚀 Kanaldaki yavaş modu kaldırır')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Yavaş modun kaldırılacağı kanal')
                .setRequired(true)),
    run: async (client, interaction) => {
        const channel = interaction.options.getChannel('kanal');

        try {
            await channel.setRateLimitPerUser(0);

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`${emojis.static.rocket || '🚀'} Hızlı Mod Aktif`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **İşlem Başarılı!**

${emojis.decorations.line}

${emojis.static.channel || '💬'} **Kanal:** ${channel}
${emojis.static.user} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.line}

${emojis.static.sparkles} Yavaş mod kaldırıldı! Kullanıcılar serbestçe yazabilir.

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🚀 Hızlı Mod Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error} **Hata!**\n\nYavaş mod kaldırılamadı. Bot yetkilerini kontrol edin.`)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
