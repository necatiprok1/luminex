const { PermissionsBitField, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const db = require("croxydb");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 AFK moduna geçersiniz')
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('AFK olma sebebiniz')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const sebep = interaction.options.getString('sebep');

        db.set(`afk_${interaction.user.id}`, sebep);
        db.set(`afkDate_${interaction.user.id}`, { date: Date.now() });

        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle(`${emojis.static.moon || '🌙'} AFK Modu Aktif`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${interaction.user.tag}
${emojis.static.info} **Sebep:** ${sebep}
${emojis.static.clock} **Başlangıç:** <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.line}

${emojis.static.bell || '🔔'} Birisi sizi etiketlediğinde AFK olduğunuz bildirilecek.

${emojis.decorations.starLine}
            `)
            .setFooter({ text: `💤 AFK Sistemi`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },
};
