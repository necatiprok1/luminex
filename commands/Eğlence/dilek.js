const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dilek')
        .setDescription('⛲ Dilek kuyusuna bir dilek at')
        .addStringOption(option =>
            option.setName('dilek')
                .setDescription('Dileğinizi yazın')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const wish = interaction.options.getString('dilek');

        const responses = [
            { text: 'Dileğin kabul oldu! ✨', type: 'success', emoji: '🌟' },
            { text: 'Yıldızlar senin için parlıyor!', type: 'success', emoji: '⭐' },
            { text: 'Evren seni duydu!', type: 'success', emoji: '🌌' },
            { text: 'Dileğin üzerinde çalışılıyor...', type: 'pending', emoji: '⏳' },
            { text: 'Biraz daha sabret...', type: 'pending', emoji: '🌙' },
            { text: 'Belirsiz... Tekrar dile!', type: 'neutral', emoji: '🔮' },
            { text: 'Başka bir dilek dene!', type: 'negative', emoji: '💫' },
            { text: 'Bu sefer olmadı...', type: 'negative', emoji: '🌧️' }
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        const colorMap = {
            success: '#57F287',
            pending: '#FEE75C',
            neutral: '#5865F2',
            negative: '#ED4245'
        };

        const embed = new EmbedBuilder()
            .setColor(colorMap[response.type])
            .setTitle(`⛲ Dilek Kuyusu`)
            .setDescription(`
${emojis.decorations.starLine}

✨ **Dileğin:**
> ${wish}

${emojis.decorations.line}

${response.emoji} **Kuyunun Cevabı:**

### ${response.text}

${emojis.decorations.starLine}
            `)
            .setThumbnail('https://em-content.zobj.net/source/apple/354/fountain_26f2.png')
            .setFooter({
                text: `⛲ ${interaction.user.tag} bir dilek diledi`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
