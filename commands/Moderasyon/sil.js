const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('🗑️ Sohbetten belirtilen sayıda mesajı siler')
        .addIntegerOption(option =>
            option
                .setName('sayı')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMaxValue(100)
                .setMinValue(1)
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Yetersiz Yetki!**\n\n🛡️ Mesajları Yönetme yetkiniz bulunmuyor.`)
                .setFooter({ text: "Moderasyon Sistemi" })
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const count = interaction.options.getInteger('sayı');

        try {
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: count });
            let totalCharacters = 0;
            let totalAttachments = 0;

            fetchedMessages.forEach(message => {
                totalCharacters += message.content.length;
                totalAttachments += message.attachments.size;
            });

            await interaction.channel.bulkDelete(fetchedMessages, true);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`✅ Mesajlar Silindi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success || '✅'} **Temizlik Tamamlandı!**

${emojis.decorations.line}

💬 **Silinen Mesaj:** \`${fetchedMessages.size}\` adet
📄 **Toplam Karakter:** \`${totalCharacters.toLocaleString()}\`
🔗 **Silinen Dosya:** \`${totalAttachments}\` adet
🛡️ **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🗑️ Mesaj Temizleme`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Hata!**\n\nMesajlar silinirken bir hata oluştu.\n\n⚠️ 14 günden eski mesajlar silinemez.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
