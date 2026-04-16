const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const starboard = require('../../utils/starboard-system');
const db = require('../../utils/mongodb-helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('⭐ Starboard sistemini ayarla')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('ayarla')
                .setDescription('Starboard kanalını ayarla')
                .addChannelOption(opt =>
                    opt.setName('kanal')
                        .setDescription('Starboard kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('eşik')
                        .setDescription('Kaç ⭐ gerekli (varsayılan: 3)')
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(sub =>
            sub.setName('kapat')
                .setDescription('Starboard sistemini kapat')),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ayarla') {
            const channel = interaction.options.getChannel('kanal');
            const threshold = interaction.options.getInteger('eşik') || 3;

            await starboard.setChannel(interaction.guild.id, channel.id);
            await starboard.setThreshold(interaction.guild.id, threshold);

            const embed = new EmbedBuilder()
                .setTitle('⭐ Starboard Ayarlandı')
                .setDescription(`**Kanal:** ${channel}\n**Eşik:** ${threshold} ⭐\n\nBir mesaj ${threshold} yıldız aldığında otomatik olarak ${channel} kanalına pinlenecek!`)
                .setColor('#FFD700');

            await interaction.reply({ embeds: [embed] });
        } else if (sub === 'kapat') {
            await db.set(`starboard_enabled_${interaction.guild.id}`, false);

            await interaction.reply({ embeds: [new EmbedBuilder().setDescription('⭐ Starboard sistemi kapatıldı.').setColor('#FF0000')] });
        }
    }
};
