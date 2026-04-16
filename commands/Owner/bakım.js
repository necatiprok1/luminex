const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../utils/mongodb-helper");
const config = require("../../config.json");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bakım")
        .setDescription("🔧 Bakım modunu açar veya kapatır (Sadece Sahip)")
        .addBooleanOption(option =>
            option
                .setName("status")
                .setDescription("Bakımı aç (true) veya kapat (false)")
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const status = interaction.options.getBoolean("status");

        if (interaction.user.id !== config.ownerID) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetkisiz Erişim!**\n\n${emojis.static.shield} Bu komutu sadece bot sahibi kullanabilir.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        if (status) {
            const bakimStatus = await db.fetch("bakım");
            if (bakimStatus) {
                const alreadyOnEmbed = new EmbedBuilder()
                    .setColor("#E67E22")
                    .setDescription(`${emojis.static.warning} **Bakım Zaten Açık!**\n\nBakım modu şu anda aktif durumda.`)
                    .setTimestamp();
                return interaction.reply({ embeds: [alreadyOnEmbed], flags: 64 });
            }

            client.user.setActivity("🔧 Bakım modu aktif!");
            await db.set("bakım", true);

            const onEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.gear || '⚙️'} Bakım Modu`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Bakım Modu Açıldı!**

${emojis.decorations.line}

${emojis.static.warning} Bot artık bakım modunda.
${emojis.static.clock} Açılma: <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.line}

${emojis.static.info} Kullanıcılar komut kullanamayacak.

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🔧 Bakım Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [onEmbed] });
        } else {
            const bakimStatus = await db.fetch("bakım");
            if (!bakimStatus) {
                const alreadyOffEmbed = new EmbedBuilder()
                    .setColor("#E67E22")
                    .setDescription(`${emojis.static.warning} **Bakım Zaten Kapalı!**\n\nBakım modu şu anda kapalı.`)
                    .setTimestamp();
                return interaction.reply({ embeds: [alreadyOffEmbed], flags: 64 });
            }

            await db.delete("bakım");

            const offEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle(`${emojis.static.gear || '⚙️'} Bakım Modu`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Bakım Modu Kapatıldı!**

${emojis.decorations.line}

${emojis.static.sparkles} Bot artık normal çalışmaya döndü.
${emojis.static.clock} Kapanma: <t:${Math.floor(Date.now() / 1000)}:R>

${emojis.decorations.line}

${emojis.static.check || '✅'} Tüm komutlar tekrar aktif.

${emojis.decorations.starLine}
                `)
                .setFooter({ text: `🔧 Bakım Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [offEmbed] });
        }
    },
};
