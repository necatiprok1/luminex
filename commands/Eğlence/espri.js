const { readFileSync } = require('fs');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('espri')
        .setDescription('😂 Rastgele bir espri söyler'),
    run: async (client, interaction) => {
        try {
            const espri = readFileSync('espri-liste.txt', 'utf-8').split('\n').filter(e => e.trim());

            if (!espri || espri.length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emojis.error} **Üzgünüm!**\n\nEspri bulunamadı.`)
                    .setTimestamp();
                return interaction.reply({ embeds: [errorEmbed] });
            }

            const randomespri = espri[Math.floor(Math.random() * espri.length)];

            const jokeEmojis = ['😂', '🤣', '😆', '😄', '😁', '🤭', '😜', '🤪'];
            const randomJokeEmoji = jokeEmojis[Math.floor(Math.random() * jokeEmojis.length)];

            const embed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle(`${randomJokeEmoji} Günün Esprisi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.static.sparkles || '✨'} **Espri:**

> ${randomespri}

${emojis.decorations.starLine}
                `)
                .setFooter({
                    text: `😄 ${interaction.user.tag} için`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error} **Hata!**\n\nEspri alınırken bir hata oluştu.`)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed] });
        }
    },
};
