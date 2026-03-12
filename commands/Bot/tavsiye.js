const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tavsiye')
        .setDescription('💡 Bot sahibine bir tavsiye veya öneri gönderir')
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Tavsiyenizi detaylı olarak yazın')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const suggestion = interaction.options.getString('mesaj');
        const ownerId = '1145367633370288189';
        const owner = await interaction.client.users.fetch(ownerId);
        const user = interaction.user.tag;
        const guild = interaction.guild.name;

        const ownerEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`✨ Yeni Tavsiye Alındı!`)
            .setDescription(`
${emojis.decorations.boxTop}

📧 **TAVSİYE İÇERİĞİ**

${emojis.decorations.line}

◆ ${suggestion}

${emojis.decorations.line}

👤 **Gönderen:** ${user}
🏰 **Sunucu:** ${guild}
🕐 **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>

${emojis.decorations.boxBottom}
            `)
            .setFooter({ text: `💫 Luminex Tavsiye Sistemi` })
            .setTimestamp();

        await owner.send({ embeds: [ownerEmbed] });

        const successEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`${emojis.success || '✅'} Tavsiye Gönderildi!`)
            .setDescription(`
${emojis.decorations.starLine}

✅ **Tavsiyeniz başarıyla iletildi!**

Değerli geri bildiriminiz için teşekkür ederiz. Ekibimiz en kısa sürede inceleyecektir.

${emojis.decorations.line}

ℹ️ **Gönderdiğiniz tavsiye:**
> ${suggestion.substring(0, 100)}${suggestion.length > 100 ? '...' : ''}

${emojis.decorations.starLine}
            `)
            .setFooter({ text: `❤️ Desteğiniz için teşekkürler!` })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
    },
};
