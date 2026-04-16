const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const QUESTIONS = [
    { q: "Dünya'nın en uzun nehri hangisidir?", options: ["Amazon", "Nil", "Tuna", "Mississippi"], answer: 1 },
    { q: "JavaScript hangi yıl oluşturuldu?", options: ["1990", "1995", "2000", "1985"], answer: 1 },
    { q: "İnsan vücudunda kaç kemik vardır?", options: ["186", "206", "256", "176"], answer: 1 },
    { q: "Türkiye'nin en yüksek dağı hangisidir?", options: ["Erciyes", "Kaçkar", "Ağrı", "Uludağ"], answer: 2 },
    { q: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?", options: ["Venüs", "Jüpiter", "Mars", "Satürn"], answer: 2 },
    { q: "Pi sayısının ilk 3 basamağı nedir?", options: ["3.12", "3.14", "3.16", "3.18"], answer: 1 },
    { q: "Discord hangi yıl kuruldu?", options: ["2013", "2014", "2015", "2016"], answer: 2 },
    { q: "Suyun kimyasal formülü nedir?", options: ["CO2", "H2O", "NaCl", "O2"], answer: 1 },
    { q: "Osmanlı İmparatorluğu hangi yıl kuruldu?", options: ["1299", "1350", "1453", "1200"], answer: 0 },
    { q: "Işık hızı saniyede kaç km'dir?", options: ["200.000", "300.000", "400.000", "150.000"], answer: 1 },
    { q: "DNA'nın açılımı nedir?", options: ["Deoksiribonükleik Asit", "Dinamik Nükleer Asit", "Dijital Nükleer Analiz", "Demir Nitrojen Asit"], answer: 0 },
    { q: "Hangi ülke en fazla ada'ya sahiptir?", options: ["Endonezya", "Filipinler", "İsveç", "Kanada"], answer: 2 },
    { q: "Einstein hangi ülkede doğdu?", options: ["ABD", "İsviçre", "Almanya", "Avusturya"], answer: 2 },
    { q: "Linux'un yaratıcısı kimdir?", options: ["Bill Gates", "Linus Torvalds", "Steve Jobs", "Dennis Ritchie"], answer: 1 },
    { q: "İstanbul Boğazı hangi iki denizi birbirine bağlar?", options: ["Akdeniz-Ege", "Karadeniz-Marmara", "Marmara-Ege", "Karadeniz-Akdeniz"], answer: 1 },
    { q: "Güneş sistemimizdeki en büyük gezegen hangisidir?", options: ["Satürn", "Neptün", "Jüpiter", "Uranüs"], answer: 2 },
    { q: "İlk programcı olarak bilinen kişi kimdir?", options: ["Alan Turing", "Ada Lovelace", "Charles Babbage", "Grace Hopper"], answer: 1 },
    { q: "Hangi element sembolü 'Fe'dir?", options: ["Flor", "Demir", "Fosfor", "Fermiyum"], answer: 1 },
    { q: "Mona Lisa'yı kim çizdi?", options: ["Michelangelo", "Da Vinci", "Raphael", "Picasso"], answer: 1 },
    { q: "Node.js hangi motoru kullanır?", options: ["SpiderMonkey", "V8", "Chakra", "Hermes"], answer: 1 },
];

const EMOJIS = ['🅰️', '🅱️', '🇨', '🇩'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('🧠 Bilgi yarışması — bilgini test et!'),

    run: async (client, interaction) => {
        const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const correctIdx = question.answer;

        const optionsStr = question.options
            .map((opt, i) => `${EMOJIS[i]} ${opt}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia — Bilgi Yarışması')
            .setDescription(`**${question.q}**\n\n${optionsStr}`)
            .setColor('#5865F2')
            .setFooter({ text: '15 saniye içinde cevapla!' });

        const row = new ActionRowBuilder().addComponents(
            question.options.map((_, i) =>
                new ButtonBuilder()
                    .setCustomId(`trivia_${i}`)
                    .setLabel(EMOJIS[i])
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const answered = new Set();

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000,
        });

        const scores = {}; // userId -> correct?

        collector.on('collect', async (i) => {
            if (answered.has(i.user.id)) {
                return i.reply({ content: '⚠️ Zaten cevapladın!', flags: 64 });
            }
            answered.add(i.user.id);

            const choice = parseInt(i.customId.split('_')[1]);
            const isCorrect = choice === correctIdx;
            scores[i.user.id] = { correct: isCorrect, username: i.user.username };

            await i.reply({
                content: isCorrect ? '✅ Doğru cevap!' : `❌ Yanlış! Doğru cevap: **${question.options[correctIdx]}**`,
                flags: 64,
            });
        });

        collector.on('end', async () => {
            const winners = Object.entries(scores).filter(([, s]) => s.correct);
            const losers = Object.entries(scores).filter(([, s]) => !s.correct);

            const resultEmbed = new EmbedBuilder()
                .setTitle('🧠 Trivia — Sonuçlar')
                .setDescription(
                    `**Soru:** ${question.q}\n` +
                    `**Cevap:** ${EMOJIS[correctIdx]} ${question.options[correctIdx]}\n\n` +
                    `✅ Doğru: ${winners.length > 0 ? winners.map(([, s]) => s.username).join(', ') : 'Kimse'}\n` +
                    `❌ Yanlış: ${losers.length > 0 ? losers.map(([, s]) => s.username).join(', ') : 'Kimse'}`
                )
                .setColor(winners.length > 0 ? '#2ECC71' : '#E74C3C');

            // Disable buttons
            const disabledRow = new ActionRowBuilder().addComponents(
                question.options.map((_, i) =>
                    new ButtonBuilder()
                        .setCustomId(`trivia_${i}`)
                        .setLabel(EMOJIS[i])
                        .setStyle(i === correctIdx ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            );

            await interaction.editReply({ embeds: [resultEmbed], components: [disabledRow] });
        });
    }
};
