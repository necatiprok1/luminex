const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

const puzzles = [
    { puzzle: 'Ağaçların üzerinde durur ama yaprakları yoktur. Nedir?', answer: 'Kardan Adam', emoji: '⛄' },
    { puzzle: 'Bir çan vardır, ama çalmaz. Nedir?', answer: 'Karpuz', emoji: '🍉' },
    { puzzle: 'Kanatsız uçar, dilsiz konuşur. Nedir?', answer: 'Rüzgar', emoji: '💨' },
    { puzzle: 'Saat kaçta durur?', answer: 'Hiç durmaz', emoji: '⏰' },
    { puzzle: 'Hangi kalemle yazı yazılmaz?', answer: 'Kuyruk kalem', emoji: '✏️' },
    { puzzle: 'Hangi bağda üzüm yetişmez?', answer: 'Oyuncak bağında', emoji: '🍇' },
    { puzzle: 'Hangi tavuğun eti yenmez?', answer: 'Horozun', emoji: '🐓' },
    { puzzle: 'Bir kedi ne zaman köpeğe benzer?', answer: 'Havladığı zaman', emoji: '🐱' },
    { puzzle: 'Yarım elma neyin nesidir?', answer: 'Diğer yarısının', emoji: '🍎' },
    { puzzle: 'Hangi taşa basınca ses çıkar?', answer: 'Org taşı', emoji: '🪨' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulmaca')
        .setDescription('🧩 Rastgele bir bulmaca gönderir'),
    run: async (client, interaction) => {
        const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`${puzzle.emoji} Bulmaca Zamanı!`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.question || '❓'} **Bulmaca:**

> ${puzzle.puzzle}

${emojis.decorations.line}

||${emojis.static.key || '🔑'} **Cevap:** ${puzzle.answer}||

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🧩 ${interaction.user.tag} için bulmaca`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
