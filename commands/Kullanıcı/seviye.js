const { SlashCommandBuilder } = require("discord.js");
const levelSystem = require("../../utils/level-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seviye")
        .setDescription("📊 Seviye ve XP bilgini görüntüle.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Başka bir kullanıcının seviyesine bak")
                .setRequired(false)
        ),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id) ||
            await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const embed = await levelSystem.getProfileEmbed(targetUser.id, interaction.guild.id, member || targetUser);
        await interaction.editReply({ embeds: [embed] });
    }
};
