const humanize = require("humanize-duration");
const { PermissionsBitField, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shard')
        .setDescription('🔮 Botun shard bilgilerini detaylı olarak gösterir.'),

    run: async (client, interaction) => {
        try {
            await interaction.deferReply();
            let shardInfo = {
                ping: await client.shard.fetchClientValues("ws.ping"),
                server_count: await client.shard.fetchClientValues("guilds.cache.size"),
                user_count: await client.shard.fetchClientValues("users.cache.size"),
                uptime: await client.shard.fetchClientValues("uptime"),
                memoryUsageRss: await client.shard.broadcastEval(function () { return process.memoryUsage().rss; }),
                voiceAdaptersSize: await client.shard.fetchClientValues("voice.adapters.size")
            };

            let shardDatas = [];
            for (let i = 0; i < client.shard.count; i++) {
                shardDatas.push({
                    shardId: i,
                    serverCount: shardInfo.server_count[i],
                    userCount: shardInfo.user_count[i],
                    ping: shardInfo.ping[i],
                    uptime: shardInfo.uptime[i],
                    memoryUsageRss: shardInfo.memoryUsageRss[i],
                    voiceAdaptersSize: shardInfo.voiceAdaptersSize[i],
                });
            }

            // Ping durumuna göre emoji
            const getPingEmoji = (ping) => {
                if (ping < 100) return '🟢';
                if (ping < 200) return '🟡';
                if (ping < 400) return '🟠';
                return '🔴';
            };

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setAuthor({
                    name: `${emojis.static.bot} ${client.user.username} • Shard Bilgileri`,
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`${emojis.decorations.starLine}\n\n${emojis.static.info} **Toplam Shard Sayısı:** \`${client.shard.count}\`\n\n${emojis.decorations.starLine}`)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(shardDatas.map(shardData => ({
                    name: `${emojis.static.sparkles} Shard ${shardData.shardId + 1}`,
                    value: `
${emojis.decorations.bullet} **Sunucular:** \`${shardData.serverCount}\` ${emojis.static.server}
${emojis.decorations.bullet} **Kullanıcılar:** \`${shardData.userCount}\` ${emojis.static.users}
${emojis.decorations.bullet} **Ping:** \`${shardData.ping}ms\` ${getPingEmoji(shardData.ping)}
${emojis.decorations.bullet} **Uptime:** \`${humanize(shardData.uptime, { language: "tr", round: true, largest: 2 })}\` ${emojis.static.clock}
${emojis.decorations.bullet} **RAM:** \`${(shardData.memoryUsageRss / (1024 ** 2)).toFixed()} MB\` 💾
${emojis.decorations.bullet} **Ses:** \`${shardData.voiceAdaptersSize}\` ${emojis.static.mic}`,
                    inline: true,
                })))
                .setFooter({
                    text: `${emojis.static.globe} Bu sunucu ${interaction.guild.shard.id + 1}. Shard'da bulunuyor`,
                    iconURL: interaction.guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nShard verileri alınırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.`)
                .setFooter({ text: "Shard Bilgi Sistemi" })
                .setTimestamp();

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed] });
                }
            } catch (e) {}
        }
    }
};
