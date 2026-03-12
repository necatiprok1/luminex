const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

const facts = [
    { fact: 'Balinalar kalp atış hızları düşerken uyur.', emoji: '🐋' },
    { fact: 'Güvercinler yönlerini belirlemek için manyetik alanları kullanırlar.', emoji: '🕊️' },
    { fact: 'Denizlerde yaşayan mavi balinalar, dünyanın en büyük hayvanlarıdır.', emoji: '🌊' },
    { fact: 'Kedilerin 32 kası vardır.', emoji: '🐱' },
    { fact: "Dünyanın en yüksek zirvesi, Everest Dağı'dır.", emoji: '🏔️' },
    { fact: 'Gökkuşağının yedi rengi vardır.', emoji: '🌈' },
    { fact: 'Bir arı, yaşamı boyunca sadece 1/12 çay kaşığı bal üretebilir.', emoji: '🐝' },
    { fact: "Antartika'daki buz tabakası, dünyadaki tatlı suyun %70'ini içerir.", emoji: '🧊' },
    { fact: "İnsan DNA'sının %99,9'u herkes için aynıdır.", emoji: '🧬' },
    { fact: 'Bir karıncanın kaldırabileceği ağırlık, kendi vücut ağırlığının 50 katıdır.', emoji: '🐜' },
    { fact: "Güneş sistemi içindeki en büyük gezegen Jüpiter'dir.", emoji: '🪐' },
    { fact: 'Ahtapotlar, kamuflaj amacıyla renk değiştirebilirler.', emoji: '🐙' },
    { fact: 'Birçok kuş, uçuş sırasında havada uyur.', emoji: '🦅' },
    { fact: "Dünyadaki en büyük okyanus, Pasifik Okyanusu'dur.", emoji: '🌏' },
    { fact: "Amazon Ormanları, dünyadaki oksijenin %20'sinden fazlasını üretir.", emoji: '🌳' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bilgi')
        .setDescription('🧠 Rastgele ilginç bir bilgi gönderir'),
    run: async (client, interaction) => {
        const randomFact = facts[Math.floor(Math.random() * facts.length)];

        const embed = new EmbedBuilder()
            .setColor('#00D4FF')
            .setTitle(`${randomFact.emoji} Biliyor Muydunuz?`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.book || '📚'} **İlginç Bilgi:**

> ${randomFact.fact}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🧠 ${interaction.user.tag} için bilgi`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
