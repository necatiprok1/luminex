const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const db = require("croxydb");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reklam-engel")
        .setDescription("🚫 Reklam engelleme sistemini açar veya kapatır"),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Mesajları Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const reklamEngel = db.fetch(`reklamengel_${interaction.guild.id}`);

        if (reklamEngel) {
            db.delete(`reklamengel_${interaction.guild.id}`);

            const offEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle(`${emojis.static.warning} Reklam Engel Sistemi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.error} **Sistem Kapatıldı!**

${emojis.decorations.line}

${emojis.static.info} Reklam içeren mesajlar artık silinmeyecek.

${emojis.decorations.bullet} Sistemi tekrar açmak için komutu yeniden kullanın.

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🚫 Reklam Engel Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [offEmbed] });
        } else {
            db.set(`reklamengel_${interaction.guild.id}`, true);

            const onEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.shield} Reklam Engel Sistemi`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Sistem Açıldı!**

${emojis.decorations.line}

${emojis.static.info} Artık reklam içeren mesajlar otomatik olarak silinecek.

${emojis.decorations.bullet} Discord davet linkleri engellenecek
${emojis.decorations.bullet} Kullanıcılar uyarılacak

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🛡️ Reklam Engel Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [onEmbed] });
        }
    }
};
