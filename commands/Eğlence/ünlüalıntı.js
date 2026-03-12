const { SlashCommandBuilder } = require('discord.js');

const celebrityQuotes = [
    { celebrity: 'Albert Einstein', quote: 'Hayal gücü bilgiden daha önemlidir.' },
    { celebrity: 'Steve Jobs', quote: 'Kalbinizi ve iç sesinizi takip edin, çünkü onlar sizin ne yapmak istediğinizi zaten biliyor.' },
    { celebrity: 'Oprah Winfrey', quote: 'Hayalinizdeki en büyük engel, hayal edememenizdir.' },
    { celebrity: 'Walt Disney', quote: 'Hayaller gerçekleşmez, sihirle gerçekleşir.' },
    { celebrity: 'Nelson Mandela', quote: 'Eğitim, dünyayı değiştirmek için en güçlü silahtır.' }
    // Daha fazla ünlü ve alıntı ekleyebilirsiniz
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ünlualıntı')
        .setDescription('Rastgele bir ünlünün alıntısını gönderir'),
    run: async (client, interaction) => {
        const randomQuote = celebrityQuotes[Math.floor(Math.random() * celebrityQuotes.length)];
        await interaction.reply(`"${randomQuote.quote}" - ${randomQuote.celebrity}`);
    },
};
