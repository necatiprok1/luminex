const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const WORDS_5 = [
    'araba', 'bahçe', 'cadde', 'dalga', 'elmas', 'fener', 'güneş', 'haber',
    'ilham', 'kalem', 'lamba', 'maden', 'nehir', 'orman', 'pasta', 'resim',
    'sahne', 'tabak', 'uzman', 'vapur', 'yılız', 'zaman', 'adres', 'bilgi',
    'cesur', 'deniz', 'ekran', 'final', 'gizli', 'hayal', 'ideal', 'kırmz',
    'limon', 'melek', 'nisan', 'opera', 'plaka', 'rengi', 'sinir', 'tıbbi',
    'robot', 'kitap', 'kapak', 'salon', 'duvar', 'köprü', 'bulut', 'hızlı',
    'bayır', 'civar', 'demir', 'ebedi', 'gurur', 'hafif', 'ikram', 'jilet',
];

// Aktif oyunlar: Map<channelId_userId, gameState>
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordle')
        .setDescription('🟩 Wordle Türkçe — 5 harfli kelime tahmin oyunu'),

    run: async (client, interaction) => {
        const key = `${interaction.channel.id}_${interaction.user.id}`;

        if (activeGames.has(key)) {
            return interaction.reply({ content: '⚠️ Zaten aktif bir Wordle oyunun var! Mevcut oyunu bitir.', flags: 64 });
        }

        const answer = WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
        const guesses = [];
        const maxGuesses = 6;

        activeGames.set(key, true);

        function renderGuess(guess) {
            let result = '';
            for (let i = 0; i < 5; i++) {
                if (guess[i] === answer[i]) {
                    result += '🟩'; // Doğru yer
                } else if (answer.includes(guess[i])) {
                    result += '🟨'; // Yanlış yer
                } else {
                    result += '⬛'; // Yok
                }
            }
            return result;
        }

        function createEmbed(status = 'playing') {
            const board = guesses.map(g => {
                const colors = renderGuess(g);
                const letters = g.split('').map(l => `**${l.toUpperCase()}**`).join(' ');
                return `${colors}\n${letters}`;
            }).join('\n\n');

            const remaining = maxGuesses - guesses.length;

            const embed = new EmbedBuilder()
                .setTitle('🟩 Wordle Türkçe')
                .setDescription(
                    (board || '*Henüz tahmin yapılmadı*') +
                    `\n\n${status === 'playing' ? `📝 Kalan hak: **${remaining}**\n5 harfli bir kelime yazın!` : ''}`
                );

            if (status === 'won') {
                embed.setColor('#2ECC71')
                    .setFooter({ text: `🎉 Tebrikler! ${guesses.length}/${maxGuesses} denemede buldun!` });
            } else if (status === 'lost') {
                embed.setColor('#E74C3C')
                    .setFooter({ text: `💀 Kaybettin! Kelime: ${answer.toUpperCase()}` });
            } else {
                embed.setColor('#5865F2')
                    .setFooter({ text: '🟩 Doğru yer | 🟨 Yanlış yer | ⬛ Yok' });
            }

            return embed;
        }

        await interaction.reply({ embeds: [createEmbed()] });

        const collector = interaction.channel.createMessageCollector({
            filter: m => m.author.id === interaction.user.id && m.content.length === 5 && /^[a-züöçşığ]+$/i.test(m.content),
            time: 300000, // 5 dakika
        });

        collector.on('collect', async (m) => {
            const guess = m.content.toLowerCase();
            try { await m.delete().catch(() => {}); } catch {}

            guesses.push(guess);

            if (guess === answer) {
                collector.stop('won');
                activeGames.delete(key);
                await interaction.editReply({ embeds: [createEmbed('won')] });
            } else if (guesses.length >= maxGuesses) {
                collector.stop('lost');
                activeGames.delete(key);
                await interaction.editReply({ embeds: [createEmbed('lost')] });
            } else {
                await interaction.editReply({ embeds: [createEmbed()] });
            }
        });

        collector.on('end', (_, reason) => {
            activeGames.delete(key);
            if (reason === 'time') {
                interaction.editReply({ embeds: [createEmbed('lost')] }).catch(() => {});
            }
        });
    }
};
