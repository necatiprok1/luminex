const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yavaş-mod')
        .setDescription('🐢 Kanal için yavaş modu ayarlar')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Yavaş modun ayarlanacağı kanal')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('süre')
                .setDescription('Bekleme süresi (saniye, 0 = kapalı)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)),
    run: async (client, interaction) => {
        const channel = interaction.options.getChannel('kanal');
        const seconds = interaction.options.getInteger('süre');

        try {
            await channel.setRateLimitPerUser(seconds);

            const isEnabled = seconds > 0;
            const embed = new EmbedBuilder()
                .setColor(isEnabled ? '#E67E22' : '#57F287')
                .setTitle(`${isEnabled ? '🐢' : '🚀'} Yavaş Mod ${isEnabled ? 'Aktif' : 'Kapalı'}`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **İşlem Başarılı!**

${emojis.decorations.line}

${emojis.static.channel || '💬'} **Kanal:** ${channel}
${emojis.static.clock || '⏰'} **Süre:** ${isEnabled ? `\`${seconds}\` saniye` : '`Kapalı`'}
${emojis.static.user} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.line}

${emojis.static.info} ${isEnabled
                        ? `Kullanıcılar mesaj göndermek için ${seconds} saniye bekleyecek.`
                        : 'Yavaş mod kapatıldı, kullanıcılar serbestçe yazabilir.'}

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🐢 Yavaş Mod Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error} **Hata!**\n\nYavaş mod ayarlanamadı. Botun yetkisi kontrol edin.`)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
