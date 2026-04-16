const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const OPTION_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anket')
        .setDescription('📊 Grafikli oylama sistemi')
        .addStringOption(opt =>
            opt.setName('soru')
                .setDescription('Anket sorusu')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('seçenekler')
                .setDescription('Seçenekleri virgülle ayırın (örn: Evet,Hayır,Belki)')
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('süre')
                .setDescription('Anket süresi (dakika, varsayılan 5)')
                .setMinValue(1)
                .setMaxValue(1440)),

    run: async (client, interaction) => {
        const question = interaction.options.getString('soru');
        const optionsStr = interaction.options.getString('seçenekler');
        const duration = (interaction.options.getInteger('süre') || 5) * 60000;
        const options = optionsStr.split(',').map(o => o.trim()).filter(Boolean).slice(0, 8);

        if (options.length < 2) {
            return interaction.reply({ content: '❌ En az 2 seçenek gerekli!', flags: 64 });
        }

        // Oyları tut: { optionIndex: Set<userId> }
        const votes = {};
        options.forEach((_, i) => votes[i] = new Set());

        function createPollEmbed(ended = false) {
            const totalVotes = Object.values(votes).reduce((sum, set) => sum + set.size, 0);

            const bars = options.map((opt, i) => {
                const count = votes[i].size;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const barLen = totalVotes > 0 ? Math.round((count / totalVotes) * 15) : 0;
                const bar = '█'.repeat(barLen) + '░'.repeat(15 - barLen);
                return `${OPTION_EMOJIS[i]} **${opt}**\n${bar} ${pct}% (${count} oy)`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${question}`)
                .setDescription(bars)
                .setColor(ended ? '#E74C3C' : '#5865F2')
                .setFooter({
                    text: ended
                        ? `Anket bitti! Toplam ${totalVotes} oy`
                        : `Toplam ${totalVotes} oy | ${Math.round(duration / 60000)} dakika süresi var`
                })
                .setTimestamp();

            return embed;
        }

        const rows = [];
        const buttonsPerRow = 4;
        for (let i = 0; i < options.length; i += buttonsPerRow) {
            const row = new ActionRowBuilder();
            for (let j = i; j < Math.min(i + buttonsPerRow, options.length); j++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_${j}`)
                        .setLabel(`${options[j]}`)
                        .setEmoji(OPTION_EMOJIS[j])
                        .setStyle(ButtonStyle.Primary)
                );
            }
            rows.push(row);
        }

        const msg = await interaction.reply({ embeds: [createPollEmbed()], components: rows, fetchReply: true });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: duration,
        });

        collector.on('collect', async (i) => {
            const optIdx = parseInt(i.customId.split('_')[1]);

            // Önceki oyu kaldır
            for (const set of Object.values(votes)) {
                set.delete(i.user.id);
            }

            // Yeni oyu ekle
            votes[optIdx].add(i.user.id);

            await i.update({ embeds: [createPollEmbed()] });
        });

        collector.on('end', async () => {
            // Butonları devre dışı bırak
            const disabledRows = rows.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(btn => {
                    newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true));
                });
                return newRow;
            });

            await msg.edit({ embeds: [createPollEmbed(true)], components: disabledRows }).catch(() => {});
        });
    }
};
