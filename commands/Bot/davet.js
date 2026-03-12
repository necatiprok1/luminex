const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("davet")
        .setDescription("🔗 Botun davet linklerini ve sosyal medya bilgilerini gösterir."),

    run: async (client, interaction) => {

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`${emojis.animated.sparkle || '✨'} Luminex Bot - Davet & Bağlantılar`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.heart} **Merhaba!** 

Beni sunucuna eklemek ister misin? Aşağıdaki butonları kullanarak beni davet edebilir, destek sunucumuza katılabilir veya bana oy verebilirsin!

${emojis.decorations.line}

${emojis.static.sparkles} **Özelliklerim:**
${emojis.decorations.bullet} Moderasyon komutları
${emojis.decorations.bullet} Eğlence komutları
${emojis.decorations.bullet} Kullanıcı araçları
${emojis.decorations.bullet} Ve çok daha fazlası!

${emojis.decorations.starLine}
            `)
            .setImage("https://media.discordapp.net/attachments/1173332244652372059/1173332398226821180/standard_1.gif")
            .setFooter({
                text: `${emojis.static.heart} Desteğin için teşekkürler!`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("🤖 Davet Et")
                    .setStyle(ButtonStyle.Link)
                    .setEmoji("🔗")
                    .setURL("https://discord.com/api/oauth2/authorize?client_id=1173201974225801288&permissions=8&scope=bot+applications.commands"),
                new ButtonBuilder()
                    .setLabel("🎉 Destek Sunucusu")
                    .setStyle(ButtonStyle.Link)
                    .setEmoji("💬")
                    .setURL("https://discord.gg/QA2eq6DXY4"),
                new ButtonBuilder()
                    .setLabel("⭐ Oy Ver")
                    .setStyle(ButtonStyle.Link)
                    .setEmoji("🏆")
                    .setURL("https://top.gg/bot/1173201974225801288")
            );

        interaction.reply({ embeds: [embed], components: [row] });
    },
};
