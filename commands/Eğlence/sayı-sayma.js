const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/mongodb-helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayisayma')
        .setDescription('Sayı sayma oyununu bu kanalda başlatır veya durdurur')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Oyunun oynanacağı kanal')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const channel = interaction.options.getChannel('kanal');
        const gameData = await db.fetch(`sayisayma_${channel.id}`);

        if (gameData && typeof gameData === 'object') {
            await db.delete(`sayisayma_${channel.id}`);
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🔢 Sayı Sayma Durduruldu')
                .setDescription(`${channel} kanalındaki oyun durduruldu.`)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        await db.set(`sayisayma_${channel.id}`, { count: 0, lastUser: null });
        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🔢 Sayı Sayma Başlatıldı')
            .setDescription(`${channel} kanalında **1** ile başlayarak sırayla sayı yazın. Aynı kişi art arda yazamaz.`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
