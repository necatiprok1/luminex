const { EmbedBuilder, Colors, version, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const moment = require("moment");
require("moment-duration-format");
const os = require("os");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("istatistik")
        .setDescription("📊 Botun detaylı istatistik bilgilerini gösterir."),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const shard = await interaction.client.shard.broadcastEval((client) => ({
            sunucu: client.guilds.cache.size,
            kanal: client.channels.cache.size,
            kullanıcı: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            rol: client.guilds.cache.reduce((acc, guild) => acc + guild.roles.cache.size, 0),
            ramkullanımı: process.memoryUsage().heapUsed
        }));

        const sunucu = shard.map(a => a.sunucu).reduce((acc, guild) => acc + guild, 0);
        const kanal = shard.map(a => a.kanal).reduce((acc, kanal) => acc + kanal, 0);
        const kullanıcı = shard.map(a => a.kullanıcı).reduce((acc, kullanıcı) => acc + kullanıcı, 0);

        const Uptime = moment
            .duration(client.uptime)
            .format(" D [gün], H [saat], m [dakika], s [saniye]");

        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`✨ Luminex Bot İstatistikleri`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`
${emojis.decorations.starLine}

🏰 **Sunucu İstatistikleri**
◆ Toplam Sunucu: \`${sunucu.toLocaleString()}\`
◆ Toplam Kullanıcı: \`${kullanıcı.toLocaleString()}\`
◆ Toplam Kanal: \`${kanal.toLocaleString()}\`

⚙️ **Teknik Bilgiler**
◆ Ping: \`${client.ws.ping}ms\`
◆ Çalışma Süresi: \`${Uptime}\`
◆ Bellek Kullanımı: \`${memUsage} MB\`
◆ CPU: \`${os.cpus().map(i => `${i.model}`)[0]}\`
◆ Discord.js: \`v${version}\`
◆ Node.js: \`${process.version}\`

🏆 **Ekip**
◆ Geliştirici: ${emojis.animated.dev}<@1145367633370288189>
◆ Ortak: ${emojis.animated.partner}<@988678929307033651>

${emojis.decorations.starLine}
            `)
            .setImage("https://media.discordapp.net/attachments/1173332244652372059/1173332398226821180/standard_1.gif")
            .setFooter({
                text: `🤖 Luminex Bot`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        interaction.editReply({ embeds: [embed] });
    }
};
