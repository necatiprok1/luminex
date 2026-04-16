const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const antiRaid = require('../../utils/anti-raid-system');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anti-raid')
        .setDescription('🛡️ Anti-raid / anti-nuke koruma sistemi')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('aç')
                .setDescription('Anti-raid sistemini aç')
                .addChannelOption(opt =>
                    opt.setName('log-kanal')
                        .setDescription('Raid uyarılarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('kapat')
                .setDescription('Anti-raid sistemini kapat'))
        .addSubcommand(sub =>
            sub.setName('kilidi-aç')
                .setDescription('Sunucu kilidini aç (raid sonrası)'))
        .addSubcommand(sub =>
            sub.setName('durum')
                .setDescription('Anti-raid durumunu göster')),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'aç') {
            const logChannel = interaction.options.getChannel('log-kanal');
            antiRaid.enable(guildId, logChannel.id);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Anti-Raid Sistemi Aktif')
                .setDescription(
                    `**Log Kanalı:** ${logChannel}\n\n` +
                    '**Korunan Tehditler:**\n' +
                    '• 🚪 Toplu katılım (10 üye / 10sn)\n' +
                    '• 🔨 Toplu ban (3 ban / 30sn)\n' +
                    '• 👢 Toplu kick (3 kick / 30sn)\n' +
                    '• 📁 Toplu kanal silme (2 / 30sn)\n' +
                    '• 🏷️ Toplu rol silme (2 / 30sn)\n\n' +
                    '⚠️ Tespit durumunda sunucu otomatik kilitlenir.'
                )
                .setColor('#2ECC71');

            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'kapat') {
            antiRaid.disable(guildId);
            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription('🛡️ Anti-raid sistemi kapatıldı.').setColor('#E74C3C')]
            });
        }

        else if (sub === 'kilidi-aç') {
            await interaction.deferReply();
            await antiRaid.unlockdown(interaction.guild);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription('🔓 Sunucu kilidi açıldı! Tüm kanallarda mesaj gönderimi tekrar aktif.').setColor('#2ECC71')]
            });
        }

        else if (sub === 'durum') {
            const settings = antiRaid.getSettings(guildId);
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Anti-Raid Durumu')
                .addFields(
                    { name: 'Durum', value: settings.enabled ? '✅ Aktif' : '❌ Kapalı', inline: true },
                    { name: 'Kilit', value: settings.lockdownActive ? '🔒 Kilitli' : '🔓 Açık', inline: true },
                    { name: 'Log Kanalı', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'Ayarlanmamış', inline: true },
                )
                .setColor(settings.enabled ? '#2ECC71' : '#E74C3C');

            await interaction.reply({ embeds: [embed] });
        }
    }
};
