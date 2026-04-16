const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/mongodb-helper');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('küfür-engel')
        .setDescription('🚫 Küfür engelleme sistemini açar veya kapatır'),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Rolleri Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        const küfürEngel = await db.fetch(`kufurengel_${interaction.guild.id}`);

        if (küfürEngel) {
            await db.delete(`kufurengel_${interaction.guild.id}`);

            const offEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle(`${emojis.static.warning} Küfür Engel Sistemi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.error} **Sistem Kapatıldı!**

${emojis.decorations.line}

${emojis.static.info} Küfür algılandığında mesajlar artık silinmeyecek.

${emojis.decorations.bullet} Sistemi tekrar açmak için komutu yeniden kullanın.

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🚫 Küfür Engel Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [offEmbed] });
        } else {
            await db.set(`kufurengel_${interaction.guild.id}`, true);

            const onEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.shield} Küfür Engel Sistemi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Sistem Açıldı!**

${emojis.decorations.line}

${emojis.static.info} Artık küfür içeren mesajlar otomatik olarak silinecek.

${emojis.decorations.bullet} Kullanıcılar uyarılacak
${emojis.decorations.bullet} Mesaj silinecek

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🛡️ Küfür Engel Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [onEmbed] });
        }
    },
};
