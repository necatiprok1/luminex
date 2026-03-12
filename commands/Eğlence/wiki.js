const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetchRandomWikipediaArticle = async () => {
    const response = await fetch('https://tr.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1');
    const data = await response.json();
    const pageId = data.query.random[0].id;
    return pageId;
  };
  
  const createWikipediaEmbed = (pageId) => {
    const embed = new EmbedBuilder()
      .setDescription(`Rastgele Wikipedia Makalesi: [Link](https://tr.wikipedia.org/wiki/?curid=${pageId})`);
    return embed;
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('wiki')
      .setDescription('Rastgele bir Wikipedia makalesi gönderir'),
    run: async (client, interaction) => {
      if (interaction.commandName !== 'wiki') {
        return;
      }
  
      try {
        const pageId = await fetchRandomWikipediaArticle();
        const embed = createWikipediaEmbed(pageId);
        await interaction.reply({embeds: [embed]});
      } catch (error) {
        console.error('An error occurred while fetching the Wikipedia article:', error);
        await interaction.reply('Oops, something went wrong while fetching the Wikipedia article. Please try again later.');
      }
    },
  };