const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

const CHOICES = {
    rock: { emoji: '🪨', name: 'Taş', beats: 'scissors' },
    paper: { emoji: '📄', name: 'Kağıt', beats: 'rock' },
    scissors: { emoji: '✂️', name: 'Makas', beats: 'paper' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("taş-kağıt-makas")
        .setDescription("✊ Taş Kağıt Makas oyna!")
        .addIntegerOption(option =>
            option.setName("bahis")
                .setDescription("Bahis miktarı (opsiyonel)")
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(1000)
        ),

    run: async (client, interaction) => {
        const bet = interaction.options.getInteger("bahis") || 0;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Bahis kontrolü
        if (bet > 0) {
            const balance = economy.getBalance(guildId, userId);
            if (balance < bet) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`❌ Yetersiz bakiye! (${balance} 💎)`)],
                    flags: 64
                });
            }
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rps_rock')
                    .setLabel('🪨 Taş')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rps_paper')
                    .setLabel('📄 Kağıt')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rps_scissors')
                    .setLabel('✂️ Makas')
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('✊ Taş Kağıt Makas')
            .setDescription(
                `${interaction.user}, seçimini yap!\n\n` +
                (bet > 0 ? `💎 **Bahis:** \`${bet}\` Luminex Coin\n` : '') +
                `⏰ *15 saniye içinde seç!*`
            )
            .setTimestamp();

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('rps_');
        const collector = msg.createMessageComponentCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async i => {
            const userChoice = i.customId.replace('rps_', '');
            const botChoice = Object.keys(CHOICES)[Math.floor(Math.random() * 3)];

            const userPick = CHOICES[userChoice];
            const botPick = CHOICES[botChoice];

            let resultText, resultColor, winAmount = 0;

            if (userChoice === botChoice) {
                resultText = '🤝 **Berabere!**';
                resultColor = '#FEE75C';
            } else if (userPick.beats === botChoice) {
                resultText = '🎉 **Kazandın!**';
                resultColor = '#57F287';
                winAmount = bet * 2; // Bahis iade + kazanç
                if (bet > 0) {
                    economy.addBalance(guildId, userId, bet * 2); // Bahis geri + kazanç
                }
            } else {
                resultText = '😔 **Kaybettin!**';
                resultColor = '#ED4245';
                winAmount = -bet;
                if (bet > 0) {
                    economy.removeBalance(guildId, userId, bet);
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle('✊ Taş Kağıt Makas — Sonuç')
                .setDescription(
                    `${userPick.emoji} **Sen:** ${userPick.name}\n` +
                    `${botPick.emoji} **Luminex:** ${botPick.name}\n\n` +
                    `${resultText}` +
                    (bet > 0 ? `\n\n💎 **${winAmount > 0 ? '+' : ''}${winAmount}** Luminex Coin` : '')
                )
                .setTimestamp();

            // Butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rps_rock_d')
                        .setLabel('🪨 Taş')
                        .setStyle(userChoice === 'rock' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('rps_paper_d')
                        .setLabel('📄 Kağıt')
                        .setStyle(userChoice === 'paper' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('rps_scissors_d')
                        .setLabel('✂️ Makas')
                        .setStyle(userChoice === 'scissors' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(true)
                );

            await i.update({ embeds: [resultEmbed], components: [disabledRow] });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#747F8D')
                    .setDescription('⏰ Süre doldu! Seçim yapılmadı.')
                    .setTimestamp();

                msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    }
};
