const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("transfer")
        .setDescription("💸 Başka bir kullanıcıya Luminex Coin gönder.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Coin göndereceğin kullanıcı")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("miktar")
                .setDescription("Göndermek istediğin miktar")
                .setRequired(true)
                .setMinValue(1)
        ),

    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser("kullanıcı");
        const amount = interaction.options.getInteger("miktar");

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ Kendine coin gönderemezsin!')],
                ephemeral: true
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ Botlara coin gönderemezsin!')],
                ephemeral: true
            });
        }

        const result = economy.transfer(interaction.guild.id, interaction.user.id, targetUser.id, amount);

        if (!result.success) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`❌ ${result.message}`)],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('💸 Transfer Başarılı!')
            .setDescription(
                `${interaction.user} → ${targetUser}\n\n` +
                `💎 **Miktar:** \`${amount.toLocaleString()}\` Luminex Coin\n\n` +
                `📤 **Senin Bakiyen:** \`${result.fromBalance.toLocaleString()}\`\n` +
                `📥 **Alıcı Bakiye:** \`${result.toBalance.toLocaleString()}\``
            )
            .setFooter({ text: '💰 Luminex Ekonomi Sistemi' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
