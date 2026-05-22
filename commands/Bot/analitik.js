const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const analytics = require('../../utils/analytics-system');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('analitik')
        .setDescription('📈 Sunucu analitik raporu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const embed = await analytics.createOverviewEmbed(interaction.guild.id, interaction.guild);
        await interaction.editReply({ embeds: [embed] });
    }
};
