const { SlashCommandBuilder, EmbedBuilder, resolveColor, PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nuke")
        .setDescription("💥 Mevcut kanalı silerek aynı konumda yeniden oluşturur"),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Kanalları Yönet yetkiniz bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const botNoPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Bot Yetkisi Yetersiz!**\n\n${emojis.static.bot} Botun Kanalları Yönet yetkisi bulunmuyor.`)
                .setTimestamp();
            return interaction.reply({ embeds: [botNoPermEmbed], flags: 64 });
        }

        const nukeEmbed = new EmbedBuilder()
            .setColor("#E67E22")
            .setTitle(`${emojis.static.fire || '💥'} Kanal Patlatıldı!`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.warning} **NUKE İŞLEMİ TAMAMLANDI!**

${emojis.decorations.line}

${emojis.static.user} **Yetkili:** ${interaction.user.toString()}
${emojis.static.clock} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>

${emojis.decorations.line}

${emojis.static.sparkles} Kanal başarıyla yeniden oluşturuldu!

${emojis.decorations.starLine}
            `)
            .setImage("https://media.tenor.com/giN2CZ60D70AAAAC/explosion-mushroom-cloud.gif")
            .setFooter({ text: `💥 Nuke Sistemi`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const clonedChannel = await interaction.channel.clone();
        await interaction.channel.delete();
        await clonedChannel.send({ embeds: [nukeEmbed] });
    },
};
