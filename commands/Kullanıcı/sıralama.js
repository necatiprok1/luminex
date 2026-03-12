const { SlashCommandBuilder } = require("discord.js");
const levelSystem = require("../../utils/level-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sıralama")
        .setDescription("🏆 Sunucu XP liderlik tablosunu gösterir."),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const embed = levelSystem.getLeaderboardEmbed(interaction.guild.id, interaction.guild);
        await interaction.editReply({ embeds: [embed] });
    }
};
