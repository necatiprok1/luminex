const { SlashCommandBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("günlük")
        .setDescription("🎁 Günlük Luminex Coin ödülünü al!"),

    run: async (client, interaction) => {
        const result = await economy.claimDaily(interaction.guild.id, interaction.user.id);
        const embed = economy.getDailyEmbed(interaction.user.id, result);
        await interaction.reply({ embeds: [embed] });
    }
};
