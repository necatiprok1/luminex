const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zar')
        .setDescription('🎲 Bir zar atar'),
    run: async (client, interaction) => {
        const result = Math.floor(Math.random() * 6) + 1;

        const diceEmojis = {
            1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
        };

        const diceColors = {
            1: '#ED4245',
            2: '#E67E22',
            3: '#FEE75C',
            4: '#57F287',
            5: '#5865F2',
            6: '#9B59B6'
        };

        const embed = new EmbedBuilder()
            .setColor(diceColors[result])
            .setTitle(`🎲 Zar Atışı`)
            .setDescription(`
${emojis.decorations.starLine}

🔄 **Zar yuvarlandı...**

${emojis.decorations.line}

${diceEmojis[result]} **Sonuç:** 

# ${result}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🎲 ${interaction.user.tag} tarafından atıldı`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
