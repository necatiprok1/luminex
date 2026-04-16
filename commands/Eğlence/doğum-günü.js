const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const birthdaySystem = require('../../utils/birthday-system');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('doğum-günü')
        .setDescription('🎂 Doğum günü sistemi')
        .addSubcommand(sub =>
            sub.setName('ayarla')
                .setDescription('Doğum gününü kaydet')
                .addIntegerOption(opt =>
                    opt.setName('gün')
                        .setDescription('Doğum günü (1-31)')
                        .setMinValue(1)
                        .setMaxValue(31)
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('ay')
                        .setDescription('Doğum ayı (1-12)')
                        .setMinValue(1)
                        .setMaxValue(12)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Doğum gününü kaldır'))
        .addSubcommand(sub =>
            sub.setName('yaklaşan')
                .setDescription('Yaklaşan doğum günlerini göster'))
        .addSubcommand(sub =>
            sub.setName('kanal')
                .setDescription('Doğum günü kutlama kanalı ayarla (Admin)')
                .addChannelOption(opt =>
                    opt.setName('kanal')
                        .setDescription('Kutlama kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'ayarla') {
            const day = interaction.options.getInteger('gün');
            const month = interaction.options.getInteger('ay');

            // Basit tarih doğrulama
            const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (day > maxDays[month - 1]) {
                return interaction.reply({ content: `❌ ${month}. ayda en fazla ${maxDays[month - 1]} gün var!`, flags: 64 });
            }

            birthdaySystem.setBirthday(guildId, interaction.user.id, day, month);

            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

            const embed = new EmbedBuilder()
                .setDescription(`🎂 Doğum günün **${day} ${monthNames[month - 1]}** olarak kaydedildi!`)
                .setColor('#FF69B4');

            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'sil') {
            birthdaySystem.removeBirthday(guildId, interaction.user.id);
            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription('🗑️ Doğum günün kaldırıldı.').setColor('#E74C3C')]
            });
        }

        else if (sub === 'yaklaşan') {
            const upcoming = birthdaySystem.getUpcoming(guildId);
            const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

            if (upcoming.length === 0) {
                return interaction.reply({ content: '📭 Yaklaşan doğum günü yok (30 gün içinde).', flags: 64 });
            }

            const desc = upcoming.map(b =>
                `🎂 <@${b.userId}> — **${b.day} ${monthNames[b.month - 1]}** *(${b.daysUntil} gün sonra)*`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🎂 Yaklaşan Doğum Günleri')
                .setDescription(desc)
                .setColor('#FF69B4');

            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'kanal') {
            if (!interaction.member.permissions.has('ManageGuild')) {
                return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkin yok.', flags: 64 });
            }
            const channel = interaction.options.getChannel('kanal');
            birthdaySystem.setChannel(guildId, channel.id);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Doğum günü kutlama kanalı ${channel} olarak ayarlandı!`)
                    .setColor('#2ECC71')]
            });
        }
    }
};
