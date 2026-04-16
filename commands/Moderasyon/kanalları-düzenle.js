const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kanalları-düzenle')
        .setDescription('📋 Sunucu kanallarını yönetim ve düzenleme araçları')
        .addSubcommand(subcommand =>
            subcommand
                .setName('listele')
                .setDescription('📑 Tüm kanalları kategori bazında listeler'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('yeniden-adlandır')
                .setDescription('✏️ Kanal adını değiştirir')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Yeniden adlandırılacak kanal')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('yeni-ad')
                        .setDescription('Kanalın yeni adı (2-100 karakter)')
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('düzenle')
                .setDescription('🔄 Kanalları kategori bazında otomatik düzenle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('arşivle')
                .setDescription('📦 Hareketsiz kanalları arşiv kategorisine taşır')),

    run: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        // ✅ Yetki kontrol
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const permEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Yetki Yok')
                .setDescription(`${emojis.error} Bu komutu kullanabilmek için **Kanalları Yönet** yetkisine ihtiyacınız var.`);
            return interaction.reply({ embeds: [permEmbed], flags: 64 });
        }

        try {
            await interaction.deferReply();

            switch (subcommand) {
                case 'listele':
                    await handleList(interaction, guild);
                    break;
                case 'yeniden-adlandır':
                    await handleRename(interaction, guild);
                    break;
                case 'düzenle':
                    await handleOrganize(interaction, guild);
                    break;
                case 'arşivle':
                    await handleArchive(interaction, guild);
                    break;
            }
        } catch (error) {
            console.error('[CHANNEL ORGANIZE] Hata:', error.message);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Hata Oluştu')
                .setDescription(`${emojis.error} Kanal düzenleme sırasında bir hata oluştu:\n\`\`\`${error.message}\`\`\``);
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

// ════════════════════════════════════════
// 🔧 Helper Functions
// ════════════════════════════════════════

async function handleList(interaction, guild) {
    const channels = await guild.channels.fetch();
    const categories = new Map();

    // Kanalları kategorilerine göre gruplama
    channels.forEach(channel => {
        if (channel.isDMBased()) return;
        
        const categoryName = channel.parent?.name || '📌 Kategori Yok';
        if (!categories.has(categoryName)) {
            categories.set(categoryName, []);
        }
        categories.get(categoryName).push(channel);
    });

    // Embed oluşturma
    let description = '';
    const maxChar = 4000;

    for (const [categoryName, chans] of categories) {
        const categoryLine = `\n**${categoryName}** (${chans.length})\n`;
        
        for (const channel of chans.sort((a, b) => a.position - b.position)) {
            let icon = '📄';
            if (channel.isVoice()) icon = '🔊';
            else if (channel.isCategory()) icon = '📂';
            else if (channel.topic) icon = '📌';

            const channelInfo = `${icon} #${channel.name} (ID: ${channel.id})\n`;
            
            if ((description + categoryLine + channelInfo).length < maxChar) {
                description += categoryLine;
                description += channelInfo;
            }
        }
    }

    const listEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Kanal Listesi')
        .setDescription(description || '📭 Kanal bulunamadı')
        .setFooter({ text: `Toplam: ${channels.size} kanal` })
        .setTimestamp();

    await interaction.editReply({ embeds: [listEmbed] });
}

async function handleRename(interaction, guild) {
    const channel = interaction.options.getChannel('kanal');
    const newName = interaction.options.getString('yeni-ad').toLowerCase().replace(/\s+/g, '-');

    if (!channel.manageable) {
        const notManageable = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`${emojis.error} Bu kanalı yönetemiyorum. Yetkilerimi kontrol edin.`);
        return interaction.editReply({ embeds: [notManageable] });
    }

    const oldName = channel.name;
    await channel.setName(newName);

    const renameEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Kanal Yeniden Adlandırıldı')
        .addFields(
            { name: '📝 Eski Ad', value: `#${oldName}`, inline: true },
            { name: '📝 Yeni Ad', value: `#${newName}`, inline: true },
            { name: '👤 Yetkili', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [renameEmbed] });
}

async function handleOrganize(interaction, guild) {
    const channels = await guild.channels.fetch();
    let organized = 0;
    let position = 0;

    // Kategorileri başa al
    const categories = channels.filter(c => c.isCategory()).sort((a, b) => a.position - b.position);
    
    for (const category of categories.values()) {
        if (category.manageable) {
            await category.setPosition(position++);
            
            // Kategori içindeki kanalları düzenle
            const childChannels = category.children.cache.sort((a, b) => {
                if (a.isVoice() && !b.isVoice()) return 1;
                if (!a.isVoice() && b.isVoice()) return -1;
                return a.name.localeCompare(b.name);
            });

            for (const [, child] of childChannels) {
                if (child.manageable) {
                    await child.setPosition(position++);
                    organized++;
                }
            }
        }
    }

    // Kategori olmayan kanalları sona koy
    const orphanedChannels = channels.filter(c => !c.isCategory() && !c.parent);
    for (const [, channel] of orphanedChannels) {
        if (channel.manageable) {
            await channel.setPosition(position++);
            organized++;
        }
    }

    const organizeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔄 Kanallar Düzenlendi')
        .setDescription(`✅ **${organized} kanal** başarıyla düzenlenmiştir.\n\nKanallar kategorilerine göre ve alfabetik sırayla düzenlenmiştir.`)
        .setFooter({ text: `Düzenleyen: ${interaction.user.tag}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [organizeEmbed] });
}

async function handleArchive(interaction, guild) {
    const channels = await guild.channels.fetch();
    let archivedCount = 0;

    // Arşiv kategorisini bul veya oluştur
    let archiveCategory = channels.find(c => c.isCategory() && c.name.toLowerCase().includes('arşiv'));
    
    if (!archiveCategory) {
        archiveCategory = await guild.channels.create({
            name: '📦-Arşiv',
            type: 4 // Category
        });
    }

    // Hareketsiz kanalları bulma (2 haftadan fazla mesaj yok)
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    
    for (const [, channel] of channels) {
        if (!channel.isTextBased() || channel.isCategory() || channel.parent?.id === archiveCategory.id) continue;

        try {
            const messages = await channel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();

            if (!lastMessage || lastMessage.createdTimestamp < twoWeeksAgo) {
                if (channel.manageable) {
                    await channel.setParent(archiveCategory);
                    archivedCount++;
                }
            }
        } catch (e) {
            // Kanal mesaj yükleyemiyorsa atla
        }
    }

    const archiveEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📦 Kanallar Arşivlendi')
        .setDescription(`✅ **${archivedCount} kanal** arşiv kategorisine taşınmıştır.\n\nİki hafta veya daha uzun süre hareketsiz olan kanallar arşivlenmiştir.`)
        .setFooter({ text: `Arşivleyen: ${interaction.user.tag}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [archiveEmbed] });
}
