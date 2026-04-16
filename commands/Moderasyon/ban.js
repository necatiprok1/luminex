const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Etiketlenen kullanıcıyı sunucudan yasaklar.')
        .addUserOption(option =>
            option
                .setName('kullanıcı')
                .setDescription('Yasaklanacak kullanıcıyı seçin')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Yasaklama sebebini belirtin')
        ),
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Yetersiz Yetki!**\n\n🛡️ Üyeleri Yasakla yetkiniz bulunmuyor.`)
                .setFooter({ text: "Moderasyon Sistemi" })
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
        }

        const user = interaction.options.getMember('kullanıcı');
        const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!user) {
            const noUserEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Kullanıcı Bulunamadı!**\n\nLütfen geçerli bir kullanıcı etiketleyin.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noUserEmbed], flags: 64 });
        }

        try {
            if (user.permissions.has(PermissionsBitField.Flags.BanMembers) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const samePermEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setDescription(`
${emojis.error || '❌'} **İşlem Başarısız!**

🛡️ Bu kullanıcının **Yasaklama Yetkisi** olduğu için yasaklayamadım.

◆ Yönetici yetkisi gerekiyor.
                    `)
                    .setTimestamp();
                return interaction.reply({ embeds: [samePermEmbed], flags: 64 });
            }

            await user.ban({ reason: sebep });

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(`🔨 Kullanıcı Yasaklandı`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.success || '✅'} **Başarılı!**

${emojis.decorations.line}

👤 **Kullanıcı:** ${user.user.tag}
🔑 **ID:** \`${user.user.id}\`
ℹ️ **Sebep:** ${sebep}
🛡️ **Yetkili:** ${interaction.user.tag}

${emojis.decorations.starLine}
                `)
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `🔨 Moderasyon Sistemi`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error || '❌'} **Hata!**\n\nBotun yetkisi yetersiz veya bir hata oluştu.\n\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();
            interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
