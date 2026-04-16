const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ticketSystem = require("../../utils/ticket-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-ayar")
        .setDescription("🎫 Ticket sistemini yapılandır ve paneli oluştur.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addRoleOption(option =>
            option.setName("destek-rolü")
                .setDescription("Ticket'lara erişebilecek destek ekibi rolü")
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const supportRole = interaction.options.getRole("destek-rolü");
        if (!supportRole?.id) {
            return interaction.reply({
                content: "❌ Geçerli bir destek rolü seçin.",
                flags: 64
            });
        }
        const result = await ticketSystem.createPanel(interaction, supportRole.id);

        await interaction.reply({
            content: result.message,
            flags: 64
        });
    }
};
