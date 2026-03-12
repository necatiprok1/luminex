const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rastgele-sayı')
        .setDescription('🔢 Belirtilen aralıkta rastgele bir sayı üretir')
        .addIntegerOption(option =>
            option.setName('min')
                .setDescription('Minimum değer')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Maksimum değer')
                .setRequired(true)),
    run: async (client, interaction) => {
        const min = interaction.options.getInteger('min');
        const max = interaction.options.getInteger('max');

        if (min >= max) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error} **Hata!**\n\nMinimum değer maksimum değerden küçük olmalıdır.`)
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const result = Math.floor(Math.random() * (max - min + 1)) + min;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emojis.static.dice || '🎲'} Rastgele Sayı`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.chart || '📊'} **Aralık:** \`${min}\` - \`${max}\`

${emojis.decorations.line}

🎯 **Sonuç:**

# ${result}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🔢 ${interaction.user.tag} tarafından`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};