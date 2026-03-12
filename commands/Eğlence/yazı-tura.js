const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yazı-tura')
        .setDescription('🪙 Yazı veya tura atar'),
    run: async (client, interaction) => {
        const isHeads = Math.random() < 0.5;
        const result = isHeads ? 'Yazı' : 'Tura';
        const resultEmoji = isHeads ? '📜' : '🪙';
        const color = isHeads ? '#5865F2' : '#E67E22';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🎲 Yazı Tura`)
            .setDescription(`
${emojis.decorations.starLine}

🔄 **Para havaya atıldı...**

${emojis.decorations.line}

${resultEmoji} **Sonuç:** 

# ${result}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🪙 ${interaction.user.tag} tarafından atıldı`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};