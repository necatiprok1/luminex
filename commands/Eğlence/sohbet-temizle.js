const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

let aiService;
try {
    aiService = require("../../utils/ai-service");
} catch (error) {
    console.log("AI Service yüklenemedi:", error.message);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sohbet-temizle')
        .setDescription('🧹 AI sohbet geçmişinizi temizler'),
    run: async (client, interaction) => {
        if (!aiService) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Hata!**\n\nAI servisi yüklenemedi.`)
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        aiService.clearHistory(interaction.guild.id, interaction.user.id);

        const successEmbed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle(`🧹 Sohbet Geçmişi Temizlendi`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.success || '✅'} **Başarılı!**

AI ile olan tüm sohbet geçmişiniz temizlendi.
Artık yeni bir sohbet başlayabilirsiniz.

${emojis.decorations.starLine}
            `)
            .setFooter({ text: `🤖 Luminex AI`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
};
