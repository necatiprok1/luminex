const { SlashCommandBuilder } = require('discord.js');
const fetchRandomChuckNorrisJoke = async () => {
    const response = await fetch('https://api.chucknorris.io/jokes/random');
    const data = await response.json();
    return data.value;
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('chucknorris')
      .setDescription('Rastgele bir Chuck Norris şakası gönderir'),
    run: async (client, interaction) => {
      if (interaction.commandName !== 'chucknorris') {
        return;
      }
  
      try {
        const joke = await fetchRandomChuckNorrisJoke();
        await interaction.reply(joke);
      } catch (error) {
        console.error('An error occurred while fetching the Chuck Norris joke:', error);
        await interaction.reply('Oops, something went wrong while fetching the Chuck Norris joke. Please try again later.');
      }
    },
  };