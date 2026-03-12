const { SlashCommandBuilder } = require('@discordjs/builders');
const fetchRandomCuteAnimal = async () => {
    const cuteAnimalAPI = 'https://api.thecatapi.com/v1/images/search';
    const response = await fetch(cuteAnimalAPI);
    const data = await response.json();
    return data[0].url;
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('sevimlihayvan')
      .setDescription('Rastgele bir sevimli hayvan görüntüsü gönderir'),
    run: async (client, interaction) => {
      if (interaction.commandName !== 'sevimlihayvan') {
        return;
      }
  
      try {
        const imageURL = await fetchRandomCuteAnimal();
        await interaction.reply(imageURL);
      } catch (error) {
        console.error('An error occurred while fetching the cute animal image:', error);
        await interaction.reply('Oops, something went wrong while fetching the cute animal image. Please try again later.');
      }
    },
  };