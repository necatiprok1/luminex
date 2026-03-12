const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emojiyaz')
        .setDescription('✏️ Yazınızı emoji harflerine çevirir')
        .addStringOption(option =>
            option.setName('yazı')
                .setDescription('Emojiye çevirmek istediğiniz yazı')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const yazi = interaction.options.getString('yazı');
        const emojiMap = {
            'a': '🅰️', 'b': '🅱️', 'c': '©️', 'd': '🇩', 'e': '🇪',
            'f': '🇫', 'g': '🇬', 'h': '🇭', 'i': 'ℹ️', 'j': '🇯',
            'k': '🇰', 'l': '🇱', 'm': 'Ⓜ️', 'n': '🇳', 'o': '🅾️',
            'p': '🅿️', 'q': '🇶', 'r': '®️', 's': '🇸', 't': '🇹',
            'u': '🇺', 'v': '🇻', 'w': '🇼', 'x': '❌', 'y': '🇾',
            'z': '🇿', ' ': '   ',
            '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣',
            '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣',
            '?': '❓', '!': '❗', '+': '➕', '-': '➖'
        };

        let emojiYazi = '';
        for (let harf of yazi.toLowerCase()) {
            if (emojiMap[harf]) {
                emojiYazi += emojiMap[harf] + ' ';
            } else {
                emojiYazi += harf + ' ';
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emojis.static.sparkles || '✨'} Emoji Yazıcı`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.file || '📝'} **Orijinal:**
\`\`\`${yazi}\`\`\`

${emojis.static.arrow || '➜'} **Emoji:**
${emojiYazi}

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `${emojis.static.user} ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
