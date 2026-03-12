const axios = require('axios');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('muzikönerisi')
        .setDescription('Rastgele bir müzik önerisi gönderir'),
    run: async (client, interaction) => {
        try {
            const response = await axios.get('https://api.deezer.com/chart');
            const randomIndex = Math.floor(Math.random() * response.data.tracks.data.length);
            const musicTitle = response.data.tracks.data[randomIndex].title;
            const musicArtist = response.data.tracks.data[randomIndex].artist.name;
            await interaction.reply(`İşte size bir müzik önerisi: ${musicTitle} - ${musicArtist}`);
        } catch (error) {
            console.error('Müzik önerisi getirilirken bir hata oluştu:', error);
            await interaction.reply('Müzik önerisi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    },
};
