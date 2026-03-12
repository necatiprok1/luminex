const axios = require('axios');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hayvan')
        .setDescription('Rastgele bir hayvan resmi gönderir'),
    run: async (client, interaction) => {
        try {
            const response = await axios.get('https://aws.random.cat/meow');
            const imageUrl = response.data.file;
            await interaction.reply(imageUrl);
        } catch (error) {
            console.error('Hayvan resmi getirilirken bir hata oluştu:', error);
            await interaction.reply('Hayvan resmi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    },
};
