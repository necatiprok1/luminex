const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fetchRandomBook = async () => {
    const response = await fetch('https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=1');
    const data = await response.json();
    return data.items[0].volumeInfo;
  };
  
  const createBookEmbed = (book) => {
    const embed = new EmbedBuilder()
      .setTitle(book.title)
      .setDescription(book.description)
      .setURL(book.infoLink)
      .setImage(book.imageLinks.thumbnail);
    return embed;
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('kitap')
      .setDescription('Rastgele bir kitap önerisi gönderir'),
    run: async (client, interaction) => {
      if (interaction.commandName !== 'kitap') {
        return;
      }
  
      try {
        const book = await fetchRandomBook();
        const embed = createBookEmbed(book);
        await interaction.reply({embeds: [embed]});
      } catch (error) {
        console.error('An error occurred while fetching the book:', error);
        await interaction.reply('Oops, something went wrong while fetching the book. Please try again later.');
      }
    },
  };