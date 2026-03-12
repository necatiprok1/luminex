const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8top')
        .setDescription('🎱 Sihirli 8 top sorunuza yanıt verir')
        .addStringOption(option =>
            option.setName('soru')
                .setDescription('Sormak istediğiniz soru')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const question = interaction.options.getString('soru');

        const answers = [
            { text: 'Kesinlikle evet!', type: 'positive', emoji: '✅' },
            { text: 'Evet!', type: 'positive', emoji: '👍' },
            { text: 'Büyük ihtimalle evet.', type: 'positive', emoji: '🟢' },
            { text: 'Her şey mümkün görünüyor.', type: 'positive', emoji: '✨' },
            { text: 'Evet, ama zaman alabilir.', type: 'neutral', emoji: '⏳' },
            { text: 'Belki...', type: 'neutral', emoji: '🤔' },
            { text: 'Sonra tekrar sor.', type: 'neutral', emoji: '🔄' },
            { text: 'Şu an söyleyemem.', type: 'neutral', emoji: '🤐' },
            { text: 'Buna güvenme.', type: 'negative', emoji: '⚠️' },
            { text: 'Hayır.', type: 'negative', emoji: '👎' },
            { text: 'Kesinlikle hayır!', type: 'negative', emoji: '❌' },
            { text: 'Çok şüpheli...', type: 'negative', emoji: '🔴' }
        ];

        const answer = answers[Math.floor(Math.random() * answers.length)];

        const colorMap = {
            positive: '#57F287',
            neutral: '#FEE75C',
            negative: '#ED4245'
        };

        const embed = new EmbedBuilder()
            .setColor(colorMap[answer.type])
            .setTitle(`🎱 Sihirli 8 Top`)
            .setDescription(`
${emojis.decorations.starLine}

❓ **Soru:**
> ${question}

${emojis.decorations.line}

${answer.emoji} **Yanıt:**

### ${answer.text}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🎱 ${interaction.user.tag} tarafından soruldu`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
