const { MessageActionRow, MessageSelectMenu, EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("⚡ Botun gecikme süresini gösterir"),

    run: async (client, interaction) => {
        const ping = client.ws.ping;

        // Ping durumuna göre emoji ve renk belirleme
        let pingStatus, pingColor, pingEmoji;
        if (ping < 100) {
            pingStatus = "Mükemmel";
            pingColor = "#57F287";
            pingEmoji = "🟢";
        } else if (ping < 200) {
            pingStatus = "İyi";
            pingColor = "#FEE75C";
            pingEmoji = "🟡";
        } else if (ping < 400) {
            pingStatus = "Orta";
            pingColor = "#E67E22";
            pingEmoji = "🟠";
        } else {
            pingStatus = "Zayıf";
            pingColor = "#ED4245";
            pingEmoji = "🔴";
        }

        const msgLatency = Math.floor(Date.now() - interaction.createdTimestamp);

        const embed = new EmbedBuilder()
            .setColor(pingColor)
            .setTitle(`⚡ Luminex Bot Ping`)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`${emojis.decorations.starLine}\n\n🚀 **Bağlantı Durumu:** ${pingEmoji} ${pingStatus}\n\n${emojis.decorations.starLine}`)
            .addFields(
                {
                    name: `🤖 Bot Gecikmesi`,
                    value: `\`\`\`ansi\n\u001b[1;32m${ping}ms\u001b[0m\n\`\`\``,
                    inline: true,
                },
                {
                    name: `💬 Mesaj Gecikmesi`,
                    value: `\`\`\`ansi\n\u001b[1;36m${msgLatency}ms\u001b[0m\n\`\`\``,
                    inline: true,
                },
                {
                    name: `🌐 API Durumu`,
                    value: `\`\`\`ansi\n\u001b[1;33m${pingStatus}\u001b[0m\n\`\`\``,
                    inline: true,
                }
            )
            .setFooter({
                text: `👤 ${interaction.user.tag} tarafından istendi`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },
};
