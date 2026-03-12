const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-yaz')
        .setDescription('📝 Özel embed mesajı oluşturur')
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('Embed başlığı')
                .setRequired(true)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('metin')
                .setDescription('Embed içeriği')
                .setRequired(true)
                .setMaxLength(4000))
        .addStringOption(option =>
            option.setName('renk')
                .setDescription('Embed rengi (hex: #5865F2)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Gönderilecek kanal (boş bırakılırsa mevcut kanal)')
                .setRequired(false)),
    run: async (client, interaction) => {
        const başlık = interaction.options.getString('başlık');
        const metin = interaction.options.getString('metin');
        const renk = interaction.options.getString('renk') || '#5865F2';
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        try {
            const embed = new EmbedBuilder()
                .setColor(renk)
                .setTitle(başlık)
                .setDescription(`
${emojis.decorations.starLine}

${metin}

${emojis.decorations.starLine}
                `)
                .setFooter({
                    text: `📝 ${interaction.user.tag} tarafından oluşturuldu`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await kanal.send({ embeds: [embed] });

            const successEmbed = new EmbedBuilder()
                .setColor("#57F287")
                .setDescription(`${emojis.success} **Embed Gönderildi!**\n\n${emojis.static.channel} Kanal: ${kanal}`)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ED4245")
                .setDescription(`${emojis.error} **Hata!**\n\nEmbed gönderilemedi. Geçerli bir renk kodu girdiğinizden emin olun.\n\n${emojis.static.info} Örnek: \`#5865F2\``)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
