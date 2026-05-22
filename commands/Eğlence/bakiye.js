const { SlashCommandBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bakiye")
        .setDescription("💰 Luminex Coin bakiyeni görüntüle.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Başka bir kullanıcının bakiyesine bak")
                .setRequired(false)
        ),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id) ||
            await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const embed = await economy.getBalanceEmbed(targetUser.id, interaction.guild.id, member || targetUser);
        await interaction.editReply({ embeds: [embed] });
    }
};
