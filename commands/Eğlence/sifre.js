const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sifre')
        .setDescription('🔐 Güvenli rastgele şifre oluşturur')
        .addIntegerOption(option =>
            option.setName('uzunluk')
                .setDescription('Şifre uzunluğu (8-50)')
                .setRequired(true)
                .setMinValue(8)
                .setMaxValue(50)
        ),
    run: async (client, interaction) => {
        const length = interaction.options.getInteger('uzunluk');

        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const charset = lowercase + uppercase + numbers + symbols;

        let password = '';
        // En az birer tane ekle
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        for (let i = password.length; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        // Shuffle
        password = password.split('').sort(() => Math.random() - 0.5).join('');

        // Şifre gücü hesaplama
        let strength = 'Zayıf';
        let strengthEmoji = '🔴';
        let strengthColor = '#ED4245';

        if (length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)) {
            strength = 'Çok Güçlü';
            strengthEmoji = '🟢';
            strengthColor = '#57F287';
        } else if (length >= 10) {
            strength = 'Güçlü';
            strengthEmoji = '🟡';
            strengthColor = '#FEE75C';
        } else if (length >= 8) {
            strength = 'Orta';
            strengthEmoji = '🟠';
            strengthColor = '#E67E22';
        }

        const embed = new EmbedBuilder()
            .setColor(strengthColor)
            .setTitle(`${emojis.static.key || '🔐'} Şifre Oluşturucu`)
            .setDescription(`
${emojis.decorations.starLine}

${emojis.static.sparkles || '✨'} **Şifreniz:**

\`\`\`${password}\`\`\`

${emojis.decorations.line}

${emojis.static.chart || '📊'} **Detaylar:**
${emojis.decorations.bullet} Uzunluk: \`${length}\` karakter
${emojis.decorations.bullet} Güç: ${strengthEmoji} ${strength}

${emojis.decorations.line}

${emojis.static.warning} Bu şifreyi güvenli bir yerde saklayın!

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `🔐 ${interaction.user.tag} için oluşturuldu`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
