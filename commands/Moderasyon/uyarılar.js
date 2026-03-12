const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("croxydb");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uyarılar")
        .setDescription("📋 Bir kullanıcının uyarı geçmişini görüntüle.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Uyarılarını görmek istediğin kullanıcı")
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser("kullanıcı");
        const guildId = interaction.guild.id;

        const warningKey = `warnings_${guildId}_${targetUser.id}`;
        const warnings = db.fetch(warningKey) || [];

        if (warnings.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57F287')
                        .setDescription(`✅ ${targetUser} hiç uyarı almamış!`)
                ],
                ephemeral: true
            });
        }

        const warningList = warnings.map((w, i) => {
            const date = new Date(w.date).toLocaleDateString('tr-TR');
            return `**${i + 1}.** ${w.reason}\n┗ 👮 <@${w.moderator}> • 📅 ${date}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle(`⚠️ ${targetUser.tag} — Uyarı Geçmişi`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `🔢 **Toplam Uyarı:** \`${warnings.length}/5\`\n\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                warningList
            )
            .setFooter({ text: '3 uyarı = Timeout | 5 uyarı = Kick' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
