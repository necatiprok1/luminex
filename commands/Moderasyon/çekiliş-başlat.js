const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const giveawaySystem = require("../../utils/giveaway-system");

/**
 * Süre parse (ör: "1h", "30m", "2d")
 */
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/i);
    if (!match) return null;
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return amount * (multipliers[unit] || 60000);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("çekiliş-başlat")
        .setDescription("🎉 Çekiliş başlat!")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(option =>
            option.setName("ödül")
                .setDescription("Çekiliş ödülü")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("süre")
                .setDescription("Çekiliş süresi (ör: 30m, 1h, 2d)")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("kazanan-sayısı")
                .setDescription("Kaç kişi kazanacak")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)
        ),

    run: async (client, interaction) => {
        const prize = interaction.options.getString("ödül");
        const durationStr = interaction.options.getString("süre");
        const winnerCount = interaction.options.getInteger("kazanan-sayısı") || 1;

        const duration = parseDuration(durationStr);

        if (!duration || duration < 60000) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setDescription('❌ Geçersiz süre! Örnekler: `30m`, `1h`, `2d`\nMinimum süre: 1 dakika')
                ],
                flags: 64
            });
        }

        if (duration > 86400000 * 30) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setDescription('❌ Maksimum süre 30 gündür!')
                ],
                flags: 64
            });
        }

        await interaction.reply({ content: '🎉 Çekiliş oluşturuluyor...', flags: 64 });

        const result = await giveawaySystem.create(interaction.channel, {
            prize,
            duration,
            winnerCount,
            hostId: interaction.user.id,
            client: interaction.client
        });

        if (result.success) {
            await interaction.editReply({ content: '✅ Çekiliş başlatıldı!' });
        }
    }
};
