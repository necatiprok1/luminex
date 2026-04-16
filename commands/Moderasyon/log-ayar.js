const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logSystem = require("../../utils/log-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("log-ayar")
        .setDescription("📋 Log sistemi kanalını ayarla.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option.setName("kanal")
                .setDescription("Log mesajlarının gönderileceği kanal")
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const channel = interaction.options.getChannel("kanal");
        const db = require("../../utils/mongodb-helper");

        // Log kanalını ayarla
        logSystem.setLogChannel(interaction.guild.id, channel.id);

        // Log modülünü aktifleştir
        await db.set(`module_${interaction.guild.id}_log-sistemi`, true);

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📋 Log Sistemi Ayarlandı')
            .setDescription(
                `✅ Log kanalı başarıyla ayarlandı!\n\n` +
                `📝 **Log Kanalı:** ${channel}\n` +
                `📊 **Loglanan Olaylar:**\n` +
                `> 🗑️ Mesaj silme\n` +
                `> ✏️ Mesaj düzenleme\n` +
                `> 📥 Üye katılma\n` +
                `> 📤 Üye ayrılma\n` +
                `> 🛡️ Moderasyon işlemleri`
            )
            .setFooter({ text: '📋 Luminex Log Sistemi' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
