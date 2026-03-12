const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oylama')
        .setDescription('🗳️ Bir oylama başlatır')
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('Oylamanın başlığını girin')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Oylamanın açıklamasını girin')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const title = interaction.options.getString('başlık');
        const description = interaction.options.getString('açıklama');

        const pollEmbed = {
            color: 0x5865F2,
            title: `${emojis.static.chart || '📊'} ${title}`,
            description: `
${emojis.decorations.starLine}

${description}

${emojis.decorations.line}

${emojis.static.info} **Nasıl Oy Verilir?**

${emojis.decorations.bullet} ${emojis.static.thumbsUp} → **Evet** oylamak için
${emojis.decorations.bullet} ${emojis.static.thumbsDown} → **Hayır** oylamak için

${emojis.decorations.starLine}
            `,
            fields: [
                {
                    name: `${emojis.static.thumbsUp} Evet`,
                    value: '```0 oy```',
                    inline: true
                },
                {
                    name: `${emojis.static.thumbsDown} Hayır`,
                    value: '```0 oy```',
                    inline: true
                }
            ],
            footer: {
                text: `🗳️ ${interaction.user.tag} tarafından başlatıldı`,
                icon_url: interaction.user.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date().toISOString()
        };

        const message = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

        await message.react('👍');
        await message.react('👎');
    },
};