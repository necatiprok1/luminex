const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('süreli-oylama')
        .setDescription('⏱️ Süreli bir oylama başlatır')
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('Oylamanın başlığı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Oylamanın açıklaması')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('süre')
                .setDescription('Süre (dakika)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1440)
        ),
    run: async (client, interaction) => {
        const title = interaction.options.getString('başlık');
        const description = interaction.options.getString('açıklama');
        const time = interaction.options.getInteger('süre');
        const endTime = Math.floor((Date.now() + time * 60 * 1000) / 1000);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emojis.static.chart || '📊'} ${title}`)
            .setDescription(`
${emojis.decorations.starLine}

${description}

${emojis.decorations.line}

${emojis.static.clock || '⏰'} **Bitiş:** <t:${endTime}:R>

${emojis.static.info} **Nasıl Oy Verilir?**
${emojis.decorations.bullet} ${emojis.static.thumbsUp} → **Evet**
${emojis.decorations.bullet} ${emojis.static.thumbsDown} → **Hayır**

${emojis.decorations.starLine}
            `)
            .setFooter({
                text: `⏱️ ${time} dakikalık oylama | ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        await message.react('👍');
        await message.react('👎');

        setTimeout(async () => {
            try {
                const fetchedMsg = await message.fetch();
                const thumbsUp = fetchedMsg.reactions.cache.get('👍')?.count - 1 || 0;
                const thumbsDown = fetchedMsg.reactions.cache.get('👎')?.count - 1 || 0;
                const totalVotes = thumbsUp + thumbsDown;

                const winner = thumbsUp > thumbsDown ? '👍 EVET' : thumbsDown > thumbsUp ? '👎 HAYIR' : '🤝 BERABERE';
                const winnerColor = thumbsUp > thumbsDown ? '#57F287' : thumbsDown > thumbsUp ? '#ED4245' : '#FEE75C';

                const resultsEmbed = new EmbedBuilder()
                    .setColor(winnerColor)
                    .setTitle(`${emojis.static.trophy || '🏆'} Oylama Sonuçları`)
                    .setDescription(`
${emojis.decorations.starLine}

${emojis.static.chart || '📊'} **${title}**

${emojis.decorations.line}

${emojis.static.thumbsUp} **Evet:** \`${thumbsUp}\` oy
${emojis.static.thumbsDown} **Hayır:** \`${thumbsDown}\` oy
${emojis.static.users || '👥'} **Toplam:** \`${totalVotes}\` oy

${emojis.decorations.line}

🏆 **Sonuç:** ${winner}

${emojis.decorations.starLine}
                    `)
                    .setFooter({ text: `✅ Oylama sona erdi`, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                await interaction.followUp({ embeds: [resultsEmbed] });
            } catch (error) {
                console.error('Oylama sonucu hatası:', error);
            }
        }, time * 60 * 1000);
    },
};
