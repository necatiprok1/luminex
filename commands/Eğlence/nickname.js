const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Rastgele bir nickname oluşturur')
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('Nickname ön eki (opsiyonel)')
        ),
    run: async (client, interaction) => {
        const prefix = interaction.options.getString('prefix') || '';
        const adjectives = ['Mighty', 'Brave', 'Swift', 'Clever', 'Wise', 'Sneaky', 'Fierce'];
        const nouns = ['Warrior', 'Wizard', 'Rogue', 'Knight', 'Sorcerer', 'Archer', 'Assassin'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const nickname = prefix + randomAdjective + randomNoun;
        await interaction.reply(nickname);
    },
};
