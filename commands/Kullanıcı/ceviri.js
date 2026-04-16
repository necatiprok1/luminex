const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const translate = require('@iamtraction/google-translate');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('çeviri')
        .setDescription('🌐 Metni istediğiniz dile çevirir')
        .addStringOption(option => option
            .setName('dil')
            .setDescription('Hedef dil kodu (örn: en, tr, de, fr)')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('metin')
            .setDescription('Çevrilecek metin')
            .setRequired(true)
        ),
    run: async (client, interaction) => {
        const lang = interaction.options.getString('dil');
        const txt = interaction.options.getString('metin');

        const langNames = {
            'tr': '🇹🇷 Türkçe',
            'en': '🇬🇧 İngilizce',
            'de': '🇩🇪 Almanca',
            'fr': '🇫🇷 Fransızca',
            'es': '🇪🇸 İspanyolca',
            'it': '🇮🇹 İtalyanca',
            'ru': '🇷🇺 Rusça',
            'ja': '🇯🇵 Japonca',
            'ko': '🇰🇷 Korece',
            'zh': '🇨🇳 Çince',
            'ar': '🇸🇦 Arapça',
            'pt': '🇧🇷 Portekizce'
        };

        try {
            const res = await translate(txt, { to: lang });
            const langName = langNames[lang] || `🌐 ${lang.toUpperCase()}`;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${emojis.static.globe || '🌐'} Çeviri Sonucu`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.static.file || '📄'} **Orijinal Metin:**
\`\`\`${txt}\`\`\`

${emojis.static.arrow || '➜'} **${langName}:**
\`\`\`${res.text}\`\`\`

${emojis.decorations.starLine}
                `)
                .setFooter({
                    text: `${emojis.static.user} ${interaction.user.tag} tarafından çevrildi`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`
${emojis.error} **Çeviri Hatası!**

${emojis.static.warning} Lütfen geçerli bir dil kodu girin.

${emojis.decorations.line}

${emojis.static.info} **Örnek Kodlar:**
\`tr\` - Türkçe | \`en\` - İngilizce | \`de\` - Almanca
\`fr\` - Fransızca | \`es\` - İspanyolca | \`ru\` - Rusça
                `)
                .setTimestamp();

            interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
