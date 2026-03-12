const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const emojis = require("../../utils/emojis");
const logSystem = require("../../utils/log-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('⏰ Bir kullanıcıya zaman aşımı uygular')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('target-user')
                .setDescription("Zaman aşımı verilecek kullanıcı")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Süre (örn: 30m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Sebep')),
    run: async (client, interaction) => {
        const mentionable = interaction.options.getUser('target-user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';

        await interaction.deferReply();

        const targetUser = await interaction.guild.members.fetch(mentionable.id).catch(() => null);

        if (!targetUser) {
            const noUserEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Kullanıcı Bulunamadı!**\n\nBu kullanıcı sunucuda bulunmuyor.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [noUserEmbed] });
        }

        if (targetUser.user.bot) {
            const botEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\n${emojis.static.bot} Botlara zaman aşımı veremezsin.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [botEmbed] });
        }

        const msDuration = ms(duration);
        if (isNaN(msDuration)) {
            const invalidEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Geçersiz Süre!**\n\n${emojis.static.info} Örnek: \`30m\`, \`1h\`, \`1d\``)
                .setTimestamp();
            return interaction.editReply({ embeds: [invalidEmbed] });
        }

        if (msDuration < 5000 || msDuration > 2.419e9) {
            const rangeEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Geçersiz Süre!**\n\n${emojis.static.clock} Süre 5 saniye ile 28 gün arasında olmalı.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [rangeEmbed] });
        }

        const targetUserRolePosition = targetUser.roles.highest.position;
        const requestUserRolePosition = interaction.member.roles.highest.position;
        const botRolePosition = interaction.guild.members.me.roles.highest.position;

        if (targetUserRolePosition >= requestUserRolePosition) {
            const hierarchyEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Bu kullanıcı sizinle aynı veya daha yüksek role sahip.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [hierarchyEmbed] });
        }

        if (targetUserRolePosition >= botRolePosition) {
            const botHierarchyEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Bot Yetkisi Yetersiz!**\n\n${emojis.static.bot} Bu kullanıcı botla aynı veya daha yüksek role sahip.`)
                .setTimestamp();
            return interaction.editReply({ embeds: [botHierarchyEmbed] });
        }

        try {
            const { default: prettyMs } = await import('pretty-ms');
            await targetUser.timeout(msDuration, reason);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.timeout || '⏰'} Zaman Aşımı Uygulandı`)
                .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${targetUser}
${emojis.static.clock} **Süre:** \`${prettyMs(msDuration, { verbose: true })}\`
${emojis.static.info} **Sebep:** ${reason}
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.line}

${emojis.static.warning} Bitiş: <t:${Math.floor((Date.now() + msDuration) / 1000)}:R>

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `⏰ Timeout Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
            // Moderasyon logu
            try {
                await logSystem.logModeration(
                    interaction.guild,
                    'timeout',
                    interaction.user,
                    targetUser.user,
                    reason
                );
            } catch (e) { }
        } catch (error) {
            console.log(`Timeout hatası: ${error}`);
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nZaman aşımı uygulanırken bir hata oluştu.`)
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
