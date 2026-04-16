const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const backupSystem = require('../../utils/backup-system');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yedekleme')
        .setDescription('💾 Sunucu yedekleme sistemi')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('oluştur')
                .setDescription('Yeni bir sunucu yedeği oluştur'))
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Mevcut yedekleri listele'))
        .addSubcommand(sub =>
            sub.setName('bilgi')
                .setDescription('Yedek detaylarını göster')
                .addStringOption(opt =>
                    opt.setName('yedek-id')
                        .setDescription('Yedek ID\'si')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('rolleri-yükle')
                .setDescription('Yedekteki rolleri geri yükle')
                .addStringOption(opt =>
                    opt.setName('yedek-id')
                        .setDescription('Yedek ID\'si')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('kanalları-yükle')
                .setDescription('Yedekteki kanalları geri yükle')
                .addStringOption(opt =>
                    opt.setName('yedek-id')
                        .setDescription('Yedek ID\'si')
                        .setRequired(true))),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();

        if (sub === 'oluştur') {
            await interaction.deferReply();
            const backup = await backupSystem.create(interaction.guild, interaction.user.id);
            const embed = backupSystem.createBackupEmbed(backup);
            embed.setDescription('✅ Yedek başarıyla oluşturuldu!\n\n⚠️ Yedek ID\'sini not edin, geri yükleme için gerekli.');
            await interaction.editReply({ embeds: [embed] });
        }

        else if (sub === 'liste') {
            const backups = backupSystem.listBackups(interaction.guild.id);
            if (backups.length === 0) {
                return interaction.reply({ content: '📭 Hiç yedek bulunamadı.', flags: 64 });
            }

            const desc = backups.map((b, i) =>
                `\`${i + 1}.\` **ID:** \`${b.id}\`\n📅 ${new Date(b.date).toLocaleString('tr-TR')} | <@${b.creator}>`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle('💾 Sunucu Yedekleri')
                .setDescription(desc)
                .setFooter({ text: 'Detay için: /yedekleme bilgi yedek-id:...' })
                .setColor('#5865F2');

            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'bilgi') {
            const backupId = interaction.options.getString('yedek-id');
            const backup = backupSystem.getBackup(interaction.guild.id, backupId);
            if (!backup) return interaction.reply({ content: '❌ Yedek bulunamadı.', flags: 64 });

            const embed = backupSystem.createBackupEmbed(backup);
            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'rolleri-yükle') {
            const backupId = interaction.options.getString('yedek-id');
            const backup = backupSystem.getBackup(interaction.guild.id, backupId);
            if (!backup) return interaction.reply({ content: '❌ Yedek bulunamadı.', flags: 64 });

            await interaction.deferReply();
            const results = await backupSystem.restoreRoles(interaction.guild, backup);

            const embed = new EmbedBuilder()
                .setTitle('🏷️ Roller Geri Yüklendi')
                .setDescription(results.join('\n'))
                .setColor('#2ECC71');

            await interaction.editReply({ embeds: [embed] });
        }

        else if (sub === 'kanalları-yükle') {
            const backupId = interaction.options.getString('yedek-id');
            const backup = backupSystem.getBackup(interaction.guild.id, backupId);
            if (!backup) return interaction.reply({ content: '❌ Yedek bulunamadı.', flags: 64 });

            await interaction.deferReply();
            const results = await backupSystem.restoreChannels(interaction.guild, backup);

            const embed = new EmbedBuilder()
                .setTitle('📁 Kanallar Geri Yüklendi')
                .setDescription(results.slice(0, 30).join('\n') + (results.length > 30 ? `\n...ve ${results.length - 30} daha` : ''))
                .setColor('#2ECC71');

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
