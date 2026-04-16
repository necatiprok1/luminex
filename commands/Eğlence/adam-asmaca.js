const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const WORDS = [
    'programlama', 'bilgisayar', 'javascript', 'discord', 'luminex', 'türkiye',
    'istanbul', 'ankara', 'matematik', 'mühendislik', 'üniversite', 'kütüphane',
    'astronot', 'galaksi', 'evren', 'müzik', 'televizyon', 'sinema', 'futbol',
    'basketbol', 'voleybol', 'denizaltı', 'helikopter', 'kahraman', 'ejderha',
    'büyücü', 'şövalye', 'hazine', 'macera', 'keşif', 'robot', 'yapay',
    'zeka', 'algoritma', 'veritabanı', 'internet', 'güvenlik', 'şifreleme',
    'telefon', 'kamera', 'resim', 'müze', 'tarih', 'coğrafya', 'biyoloji',
    'kimya', 'fizik', 'felsefe', 'psikoloji', 'ekonomi', 'politika',
];

const HANGMAN_STAGES = [
    '```\n  +---+\n      |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n  |   |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|   |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adam-asmaca')
        .setDescription('🎯 Adam asmaca oyunu oyna'),

    run: async (client, interaction) => {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const guessed = new Set();
        let wrongGuesses = 0;
        const maxWrong = 6;

        function getDisplay() {
            return word.split('').map(c => guessed.has(c) ? c : '\_').join(' ');
        }

        function isWon() {
            return word.split('').every(c => guessed.has(c));
        }

        function createEmbed(status = 'playing') {
            const display = getDisplay();
            const embed = new EmbedBuilder()
                .setTitle('🎯 Adam Asmaca')
                .setDescription(
                    `${HANGMAN_STAGES[wrongGuesses]}\n\n` +
                    `**Kelime:** ${display}\n` +
                    `**Yanlış:** ${wrongGuesses}/${maxWrong}\n` +
                    `**Tahmin Edilen:** ${[...guessed].join(', ') || 'Yok'}`
                );

            if (status === 'won') {
                embed.setColor('#2ECC71')
                    .setFooter({ text: `🎉 Tebrikler! Kelime: ${word}` });
            } else if (status === 'lost') {
                embed.setColor('#E74C3C')
                    .setFooter({ text: `💀 Kaybettin! Kelime: ${word}` });
            } else {
                embed.setColor('#5865F2')
                    .setFooter({ text: 'Bir harf yazarak tahmin edin!' });
            }
            return embed;
        }

        const msg = await interaction.reply({ embeds: [createEmbed()], fetchReply: true });

        const collector = interaction.channel.createMessageCollector({
            filter: m => m.author.id === interaction.user.id && m.content.length === 1 && /[a-züöçşığ]/i.test(m.content),
            time: 120000,
        });

        collector.on('collect', async (m) => {
            const letter = m.content.toLowerCase();
            try { await m.delete().catch(() => {}); } catch {}

            if (guessed.has(letter)) return;
            guessed.add(letter);

            if (!word.includes(letter)) {
                wrongGuesses++;
            }

            if (isWon()) {
                collector.stop('won');
                await interaction.editReply({ embeds: [createEmbed('won')] });
            } else if (wrongGuesses >= maxWrong) {
                collector.stop('lost');
                await interaction.editReply({ embeds: [createEmbed('lost')] });
            } else {
                await interaction.editReply({ embeds: [createEmbed()] });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [createEmbed('lost')] }).catch(() => {});
            }
        });
    }
};
