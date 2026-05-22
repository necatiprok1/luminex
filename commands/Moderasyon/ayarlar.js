const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../utils/mongodb-helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayarlar')
        .setDescription('⚙️ Bot ayarlarını yönet')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('göster')
                .setDescription('Mevcut ayarları göster'))
        .addSubcommand(sub =>
            sub.setName('hoşgeldin-kanal')
                .setDescription('Hoşgeldin mesajı kanalı')
                .addChannelOption(opt =>
                    opt.setName('kanal')
                        .setDescription('Hoşgeldin kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('hoşgeldin-mesaj')
                .setDescription('Hoşgeldin mesajı özelleştir')
                .addStringOption(opt =>
                    opt.setName('mesaj')
                        .setDescription('{user} = kullanıcı, {server} = sunucu, {count} = üye sayısı')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('hoşgeldin-resim')
                .setDescription('Hoşgeldin resmi aç/kapat')
                .addBooleanOption(opt =>
                    opt.setName('durum')
                        .setDescription('Açık/Kapalı')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('seviye-sistemi')
                .setDescription('Seviye sistemini aç/kapat')
                .addBooleanOption(opt =>
                    opt.setName('durum')
                        .setDescription('Açık/Kapalı')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('ekonomi-sistemi')
                .setDescription('Ekonomi sistemini aç/kapat')
                .addBooleanOption(opt =>
                    opt.setName('durum')
                        .setDescription('Açık/Kapalı')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('ai-sistemi')
                .setDescription('AI sohbet sistemini aç/kapat')
                .addBooleanOption(opt =>
                    opt.setName('durum')
                        .setDescription('Açık/Kapalı')
                        .setRequired(true))),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'göster') {
            const welcomeChannel = await db.fetch(`hosgeldinkanal_${guildId}`);
            const aiMod = await db.fetch(`aimod_${guildId}`);
            const levelMod = await db.fetch(`module_${guildId}_seviye-sistemi`);
            const welcomeImage = await db.fetch(`module_${guildId}_hosgeldin-sistemi`);
            const logChannel = await db.fetch(`log_channel_${guildId}`);
            const antiRaid = await db.fetch(`antiraid_enabled_${guildId}`);
            const starboard = await db.fetch(`starboard_enabled_${guildId}`);
            const kufurEngel = await db.fetch(`kufurengel_${guildId}`);
            const reklamEngel = await db.fetch(`reklamengel_${guildId}`);

            const settings = {
                'Hoşgeldin Kanalı': welcomeChannel ? `<#${welcomeChannel}>` : '❌ Ayarlanmamış',
                'Hoşgeldin Mesajı': (await db.fetch(`welcome_message_${guildId}`)) || '*(Varsayılan)*',
                'Hoşgeldin Resmi': welcomeImage ? '✅ Açık' : '❌ Kapalı',
                'Seviye Sistemi': levelMod === false ? '❌ Kapalı' : '✅ Açık',
                'Ekonomi Sistemi': (await db.fetch(`economy_disabled_${guildId}`)) ? '❌ Kapalı' : '✅ Açık',
                'AI Sistemi': aiMod === false ? '❌ Kapalı' : '✅ Açık',
                'Anti-Raid': antiRaid ? '✅ Açık' : '❌ Kapalı',
                'Starboard': starboard ? '✅ Açık' : '❌ Kapalı',
                'Log Kanalı': logChannel ? `<#${logChannel}>` : '❌ Ayarlanmamış',
                'Küfür Engel': kufurEngel ? '✅ Açık' : '❌ Kapalı',
                'Reklam Engel': reklamEngel ? '✅ Açık' : '❌ Kapalı',
            };

            const desc = Object.entries(settings)
                .map(([key, val]) => `**${key}:** ${val}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`⚙️ ${interaction.guild.name} — Ayarlar`)
                .setDescription(desc)
                .setColor('#5865F2')
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: 'Her ayarı /ayarlar alt-komutlarıyla değiştirebilirsin.' });

            await interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'hoşgeldin-kanal') {
            const channel = interaction.options.getChannel('kanal');
            await db.set(`hosgeldinkanal_${guildId}`, channel.id);
            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`✅ Hoşgeldin kanalı ${channel} olarak ayarlandı.`).setColor('#2ECC71')]
            });
        }

        else if (sub === 'hoşgeldin-mesaj') {
            const message = interaction.options.getString('mesaj');
            await db.set(`welcome_message_${guildId}`, message);
            const preview = message
                .replace('{user}', interaction.user.toString())
                .replace('{server}', interaction.guild.name)
                .replace('{count}', interaction.guild.memberCount);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Hoşgeldin mesajı ayarlandı!\n\n**Önizleme:**\n${preview}`)
                    .setColor('#2ECC71')]
            });
        }

        else if (sub === 'hoşgeldin-resim') {
            const durum = interaction.options.getBoolean('durum');
            await db.set(`module_${guildId}_hosgeldin-sistemi`, durum);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Hoşgeldin resmi ${durum ? 'açıldı' : 'kapatıldı'}.`)
                    .setColor(durum ? '#2ECC71' : '#E74C3C')]
            });
        }

        else if (sub === 'seviye-sistemi') {
            const durum = interaction.options.getBoolean('durum');
            // messageCreate.js checks: moduleSetting !== false → açık
            // false = kapalı, true/null = açık
            await db.set(`module_${guildId}_seviye-sistemi`, durum ? true : false);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Seviye sistemi ${durum ? 'açıldı' : 'kapatıldı'}.`)
                    .setColor(durum ? '#2ECC71' : '#E74C3C')]
            });
        }

        else if (sub === 'ekonomi-sistemi') {
            const durum = interaction.options.getBoolean('durum');
            await db.set(`economy_disabled_${guildId}`, !durum);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Ekonomi sistemi ${durum ? 'açıldı' : 'kapatıldı'}.`)
                    .setColor(durum ? '#2ECC71' : '#E74C3C')]
            });
        }

        else if (sub === 'ai-sistemi') {
            const durum = interaction.options.getBoolean('durum');
            // ai-service.js checks: aimod_{id} !== false → açık
            // false = kapalı, true/null = açık
            await db.set(`aimod_${guildId}`, durum ? true : false);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ AI sohbet sistemi ${durum ? 'açıldı' : 'kapatıldı'}.`)
                    .setColor(durum ? '#2ECC71' : '#E74C3C')]
            });
        }
    }
};
