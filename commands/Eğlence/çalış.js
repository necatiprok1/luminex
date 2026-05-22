const { SlashCommandBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("çalış")
        .setDescription("💼 Çalışarak Luminex Coin kazan!"),

    run: async (client, interaction) => {
        const result = await economy.work(interaction.guild.id, interaction.user.id);
        const embed = economy.getWorkEmbed(interaction.user.id, result);
        await interaction.reply({ embeds: [embed] });
    }
};
