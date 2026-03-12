const { SlashCommandBuilder } = require('discord.js');

const jokes = [
    'Temel bir gün yolda yürürken düşer. Arkadaşı Dursun hemen yanına koşarak, "Temel, ne oldu sana?" der. Temel cevaplar: "Annenin kabusu geldi."',
    'Hangi kapıdan geçilmez? Dolaptan geçilmez.',
    // Daha fazla fıkra ekleyebilirsiniz
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fıkra')
        .setDescription('Rastgele bir fıkra gönderir'),
    run: async (client, interaction) => {
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await interaction.reply(randomJoke);
    },
};
