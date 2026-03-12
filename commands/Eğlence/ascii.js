const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const asciiArt = require('ascii-art');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ascii')
        .setDescription('🔤 Metni ASCII sanatına dönüştürür')
        .addStringOption(option =>
            option.setName('metin')
                .setDescription('ASCII sanatına dönüştürülecek metin')
                .setRequired(true)
                .setMaxLength(15)
        ),
    run: async (client, interaction) => {
        const text = interaction.options.getString('metin');

        asciiArt.font(text, 'Doom', async ascii => {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${emojis.static.sparkles || '✨'} ASCII Sanat`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.static.file || '📝'} **Orijinal:** \`${text}\`

${emojis.decorations.line}

\`\`\`
${ascii}
\`\`\`

${emojis.decorations.starLine}
                `)
                .setFooter({
                    text: `🔤 ${interaction.user.tag} tarafından oluşturuldu`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        });
    },
};
