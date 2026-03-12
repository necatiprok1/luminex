const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

const philosophicalQuotes = [
    { quote: 'Bilgi, kendini bilme sanatıdır.', author: 'Göktürkler', emoji: '📚' },
    { quote: 'Düşünmek, insanın en yüce zevklerinden biridir.', author: 'Aristoteles', emoji: '🤔' },
    { quote: 'Hayatı anlamlandırmak, ona anlam katmaktır.', author: 'Viktor Frankl', emoji: '🌟' },
    { quote: 'Bir insanın gerçek kişiliği, zor zamanlarında ortaya çıkar.', author: 'Bilinmiyor', emoji: '💎' },
    { quote: 'Felsefe, yaşamın anlamını aramaktır.', author: 'Platon', emoji: '🔍' },
    { quote: 'Bilgelik, cehaletin farkındalığıdır.', author: 'Sokrates', emoji: '🦉' },
    { quote: 'İnsan, düşünebilen bir canlıdır.', author: 'Descartes', emoji: '🧠' },
    { quote: 'Bilgi, güçtür.', author: 'Francis Bacon', emoji: '⚡' },
    { quote: 'Felsefe, karanlıkta çarpışmaktır.', author: 'Voltaire', emoji: '🌙' },
    { quote: 'Özgürlük, bağlılığın bilincidir.', author: 'Jean-Paul Sartre', emoji: '🕊️' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('felsefe')
        .setDescription('🦉 Rastgele bir felsefi alıntı gönderir'),
    run: async (client, interaction) => {
        const philosophy = philosophicalQuotes[Math.floor(Math.random() * philosophicalQuotes.length)];

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`${philosophy.emoji} Felsefi Düşünce`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.book || '📖'} **Alıntı:**

> *"${philosophy.quote}"*

${emojis.decorations.line}

✍️ **—** *${philosophy.author}*

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🦉 ${interaction.user.tag} için`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
