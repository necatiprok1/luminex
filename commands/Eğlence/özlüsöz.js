const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

const quotes = [
    { quote: "Başkalarının kusurlarını görmek için aynaya bak.", author: "Anonim", emoji: "🪞" },
    { quote: "Hayatın tadını çıkar, çünkü geri gelmeyecek.", author: "Anonim", emoji: "🌅" },
    { quote: "İmkansız görünen şeyler, aslında imkansız değildir.", author: "Anonim", emoji: "✨" },
    { quote: "Hayal etmek, başarmanın yarısıdır.", author: "Anonim", emoji: "💭" },
    { quote: "Bugün yapabileceğin en iyi şeyi yap, yarın için pişman olma.", author: "Anonim", emoji: "🌟" },
    { quote: "Sabır acıdır, meyvesi tatlıdır.", author: "Anonim", emoji: "🍎" },
    { quote: "Düşen kalkmayı öğrenir.", author: "Türk Atasözü", emoji: "🦋" },
    { quote: "Her şeyin başı sağlıktır.", author: "Türk Atasözü", emoji: "💪" },
    { quote: "Damlaya damlaya göl olur.", author: "Türk Atasözü", emoji: "💧" },
    { quote: "Akıl yaşta değil, baştadır.", author: "Türk Atasözü", emoji: "🧠" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('özlusoz')
        .setDescription('💬 Rastgele bir özlü söz gönderir'),
    run: async (client, interaction) => {
        const quote = quotes[Math.floor(Math.random() * quotes.length)];

        const embed = new EmbedBuilder()
            .setColor('#1ABC9C')
            .setTitle(`${quote.emoji} Özlü Söz`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.sparkles || '✨'} **Söz:**

> *"${quote.quote}"*

${emojis.decorations.line}

✍️ **—** *${quote.author}*

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `💬 ${interaction.user.tag} için`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
