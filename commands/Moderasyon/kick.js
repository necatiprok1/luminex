const { PermissionsBitField, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Etiketlenen kullanıcıyı sunucudan atar.')
        .addUserOption(option =>
            option
                .setName('kullanıcı')
                .setDescription('Atılacak kullanıcıyı seçin')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Atma sebebini belirtin')
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Yetersiz Yetki!**\n\n${emojis.static.shield} Üyeleri Atma yetkiniz bulunmuyor.`)
                .setFooter({ text: "Moderasyon Sistemi" })
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const user = interaction.options.getMember('kullanıcı');
        const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!user) {
            const noUserEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Kullanıcı Bulunamadı!**\n\nLütfen geçerli bir kullanıcı etiketleyin.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noUserEmbed], ephemeral: true });
        }

        try {
            if (user.permissions.has(PermissionsBitField.Flags.KickMembers) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const samePermEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setDescription(`
${emojis.error} **İşlem Başarısız!**

${emojis.static.shield} Bu kullanıcının **Atma Yetkisi** olduğu için atamadım.

${emojis.decorations.bullet} Yönetici yetkisi gerekiyor.
                    `)
                    .setTimestamp();
                return interaction.reply({ embeds: [samePermEmbed], ephemeral: true });
            }

            await user.kick(sebep);

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`${emojis.static.kick} Kullanıcı Atıldı`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success} **Başarılı!**

${emojis.decorations.line}

${emojis.static.user} **Kullanıcı:** ${user.user.tag}
${emojis.static.key} **ID:** \`${user.user.id}\`
${emojis.static.info} **Sebep:** ${sebep}
${emojis.static.shield} **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `👢 Moderasyon Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nBotun yetkisi yetersiz.\n\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
