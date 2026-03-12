const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

const motivationalQuotes = [
    { quote: 'Her başarı, yeni bir başlangıçtır.', emoji: '🚀' },
    { quote: 'Sadece hedeflerinize odaklanın, yıldızlar arasında kaybolmayın.', emoji: '⭐' },
    { quote: 'Engeller sizi durduramaz, sadece yavaşlatabilir.', emoji: '💪' },
    { quote: 'Daima ileriye bakın, geride kalanlar sizi geri çekemez.', emoji: '🏃' },
    { quote: 'Güneş doğmadan karanlığın en derin olduğu zamandır.', emoji: '🌅' },
    { quote: 'Başarı, en çok çalışanın değil, asla pes etmeyenindir.', emoji: '🔥' },
    { quote: 'Başarı, onun için çalışanın değil, ona inananındır.', emoji: '✨' },
    { quote: 'İmkansız gibi görünen her şeyi başarabilirsiniz.', emoji: '🌟' },
    { quote: 'Bugün attığınız her adım, yarın hedeflerinize daha yakın olmanızı sağlar.', emoji: '👟' },
    { quote: 'Her hayal, gerçeğe dönüşmek için bir adımdır.', emoji: '💭' },
    { quote: 'İyi bir başlangıç, yarının başarısının temelidir.', emoji: '🌱' },
    { quote: 'Düşmekten korkma, her düşüş, bir sonraki yükselişe hazırlıktır.', emoji: '📈' },
    { quote: 'Hayat, zorluklarla dolu bir yolculuktur, ama yolun sonu parlaklıkla doludur.', emoji: '🛤️' },
    { quote: 'Başarısızlık, yalnızca denemekten vazgeçtiğinizde gerçekleşir.', emoji: '🎯' },
    { quote: 'Küçük adımlarla bile, ilerleme hala ilerlemektir.', emoji: '🐢' },
    { quote: 'Hayal ettiğiniz her şeyi başarabilirsiniz, yeter ki inanın ve çalışın.', emoji: '💫' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('motivasyon')
        .setDescription('💪 Günlük motivasyon sözü gönderir'),
    run: async (client, interaction) => {
        const motivation = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle(`${motivation.emoji} Günün Motivasyon Sözü`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.sparkles || '✨'} **Motivasyon:**

> *"${motivation.quote}"*

${emojis.decorations.line}

${emojis.static.heart || '❤️'} Bugün harika şeyler başaracaksın!

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `💪 ${interaction.user.tag} için motivasyon`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
