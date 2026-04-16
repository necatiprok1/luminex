const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const statsSystem = require('../../utils/stats-channel-system');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu-istatistik')
        .setDescription('📊 Sunucu istatistik kanallarını yönet')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('kur')
                .setDescription('İstatistik kanallarını oluştur (voice kanallar)'))
        .addSubcommand(sub =>
            sub.setName('kaldır')
                .setDescription('İstatistik kanallarını kaldır'))
        .addSubcommand(sub =>
            sub.setName('güncelle')
                .setDescription('İstatistikleri manuel güncelle')),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();

        if (sub === 'kur') {
            const settings = statsSystem.getSettings(interaction.guild.id);
            if (settings.enabled) {
                return interaction.reply({ content: '⚠️ İstatistik kanalları zaten kurulu! Önce `/sunucu-istatistik kaldır` yapın.', flags: 64 });
            }

            await interaction.deferReply();
            const channels = await statsSystem.setup(interaction.guild);

            const embed = new EmbedBuilder()
                .setTitle('📊 İstatistik Kanalları Oluşturuldu!')
                .setDescription(
                    '✅ Aşağıdaki voice kanallar oluşturuldu:\n\n' +
                    `👥 Üye Sayısı\n` +
                    `🟢 Çevrimiçi Sayısı\n` +
                    `💎 Boost Sayısı\n` +
                    `🏷️ Rol Sayısı\n` +
                    `📁 Kanal Sayısı\n\n` +
                    '*Kanallar otomatik olarak her 10 dakikada güncellenir.*'
                )
                .setColor('#2ECC71');

            await interaction.editReply({ embeds: [embed] });
        }

        else if (sub === 'kaldır') {
            await interaction.deferReply();
            await statsSystem.remove(interaction.guild);

            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription('🗑️ İstatistik kanalları kaldırıldı.').setColor('#E74C3C')]
            });
        }

        else if (sub === 'güncelle') {
            await interaction.deferReply();
            await statsSystem.update(interaction.guild);

            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription('✅ İstatistikler güncellendi!').setColor('#2ECC71')]
            });
        }
    }
};
