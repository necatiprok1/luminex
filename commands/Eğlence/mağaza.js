const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const economy = require("../../utils/economy-system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mağaza")
        .setDescription("🏪 Luminex Coin ile ürün satın al!"),

    run: async (client, interaction) => {
        const items = economy.getShopItems(interaction.guild.id);
        const balance = economy.getBalance(interaction.guild.id, interaction.user.id);

        const itemList = items.map((item, i) => {
            const affordable = balance >= item.price ? '✅' : '❌';
            return `${affordable} **${item.name}**\n┗ ${item.desc} — \`${item.price.toLocaleString()}\` 💎`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🏪 Luminex Mağaza')
            .setDescription(
                `💎 **Bakiyen:** \`${balance.toLocaleString()}\` Luminex Coin\n\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                `${itemList}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `*Satın almak için aşağıdan bir ürün seç!*`
            )
            .setFooter({ text: '🏪 Luminex Mağaza Sistemi' })
            .setTimestamp();

        const options = items.map(item => ({
            label: item.name.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '').trim(),
            description: `${item.price.toLocaleString()} Luminex Coin`,
            value: item.id,
            emoji: item.name.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🛒'
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_buy')
                    .setPlaceholder('🛒 Bir ürün seç...')
                    .addOptions(options)
            );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;

            const itemId = i.values[0];
            const result = economy.buyItem(interaction.guild.id, interaction.user.id, itemId);

            if (!result.success) {
                await i.reply({ content: `❌ ${result.message}`, flags: 64 });
                return;
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 Satın Alma Başarılı!')
                .setDescription(
                    `**${result.item.name}** satın alındı!\n\n` +
                    `💎 **Ödenen:** \`${result.item.price.toLocaleString()}\`\n` +
                    `💳 **Kalan Bakiye:** \`${result.newBalance.toLocaleString()}\``
                )
                .setTimestamp();

            await i.reply({ embeds: [successEmbed], flags: 64 });
        });

        collector.on('end', () => {
            const disabledRow = ActionRowBuilder.from(row);
            disabledRow.components[0].setDisabled(true);
            msg.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
