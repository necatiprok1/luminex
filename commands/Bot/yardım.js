const { ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("yardım")
        .setDescription("📚 Botun yardım menüsünü ve komutlarını gösterir."),

    run: async (client, interaction) => {
        const commandFolders = fs.readdirSync('./commands');
        const categories = {};

        // Load commands dynamically
        for (const folder of commandFolders) {
            if (folder.startsWith('.')) continue;

            const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
            const cmds = [];

            for (const file of commandFiles) {
                try {
                    const cmd = require(`../${folder}/${file}`);
                    if (cmd.data) {
                        cmds.push({
                            name: cmd.data.name,
                            description: cmd.data.description || "Açıklama yok."
                        });
                    } else if (cmd.name) {
                        cmds.push({
                            name: cmd.name,
                            description: cmd.description || "Açıklama yok."
                        });
                    }
                } catch (e) {
                    console.error(`Error loading command for help: ${file}`, e);
                }
            }
            if (cmds.length > 0) {
                categories[folder] = cmds;
            }
        }

        // Kategori emojileri ve açıklamaları
        const categoryInfo = {
            'Bot': {
                emoji: '🤖',
                description: 'Bot bilgileri ve ayarları',
                color: '#5865F2'
            },
            'Moderasyon': {
                emoji: '🛡️',
                description: 'Sunucu yönetim komutları',
                color: '#ED4245'
            },
            'Kullanıcı': {
                emoji: '👤',
                description: 'Kullanıcı araçları ve bilgileri',
                color: '#57F287'
            },
            'Eğlence': {
                emoji: '🎉',
                description: 'Eğlenceli ve interaktif komutlar',
                color: '#FEE75C'
            },
            'Owner': {
                emoji: '👑',
                description: 'Sadece bot sahibi için',
                color: '#F47FFF'
            }
        };

        // Create Menu Options
        const options = [];

        options.push({
            label: '🏠 Ana Menü',
            description: 'Ana yardım ekranına dön',
            emoji: '🏠',
            value: 'home',
        });

        for (const [folder, cmds] of Object.entries(categories)) {
            const info = categoryInfo[folder] || { emoji: '📁', description: 'Kategori komutları' };
            options.push({
                label: `${info.emoji} ${folder}`,
                description: `${cmds.length} komut - ${info.description}`,
                emoji: info.emoji,
                value: `category_${folder}`,
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_menu')
                    .setPlaceholder(`🔍 Bir kategori seçin...`)
                    .addOptions(options)
            );

        // Toplam komut sayısını hesapla
        const totalCommands = Object.values(categories).reduce((sum, cmds) => sum + cmds.length, 0);

        // Ana Embed
        const homeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`✨ ${client.user.username} - Yardım Merkezi`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`
${emojis.decorations.starLine}

👋 **Merhaba ${interaction.user}!**

Aşağıdaki menüden kategorileri seçerek komutlarımı inceleyebilirsin.

${emojis.decorations.line}

📊 **İstatistikler**
◆ Toplam Komut: \`${totalCommands}\`
◆ Toplam Kategori: \`${Object.keys(categories).length}\`

${emojis.decorations.line}

📁 **Kategoriler**
${Object.entries(categories).map(([folder, cmds]) => {
                const info = categoryInfo[folder] || { emoji: '📁' };
                return `${info.emoji} **${folder}** → \`${cmds.length}\` komut`;
            }).join('\n')}

${emojis.decorations.starLine}
            `)
            .setImage("https://media.discordapp.net/attachments/1173332244652372059/1173332398226821180/standard_1.gif")
            .setFooter({
                text: `ℹ️ Bir kategori seçin • Luminex Bot`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        const msg = await interaction.reply({ embeds: [homeEmbed], components: [row] });

        // Collector
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;
            const selection = i.values[0];

            if (selection === 'home') {
                await i.update({ embeds: [homeEmbed], components: [row] });
            } else if (selection.startsWith('category_')) {
                const categoryName = selection.replace('category_', '');
                const cmds = categories[categoryName];
                const info = categoryInfo[categoryName] || { emoji: '📁', color: '#5865F2' };

                if (cmds) {
                    const fields = cmds.map((cmd, index) => ({
                        name: `${index + 1}. /${cmd.name}`,
                        value: `> ${cmd.description}`,
                        inline: false
                    }));

                    const displayFields = fields.slice(0, 25);

                    const catEmbed = new EmbedBuilder()
                        .setColor(info.color || '#5865F2')
                        .setTitle(`${info.emoji} ${categoryName} Komutları`)
                        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`
${emojis.decorations.starLine}

ℹ️ **${categoryName}** kategorisindeki tüm komutlar aşağıda listelenmiştir.

◆ Toplam: \`${cmds.length}\` komut
${displayFields.length < fields.length ? `\n⚠️ *İlk 25 komut gösteriliyor*` : ''}

${emojis.decorations.starLine}
                        `)
                        .addFields(displayFields)
                        .setFooter({
                            text: `${info.emoji} ${categoryName} • ${cmds.length} komut`,
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    await i.update({ embeds: [catEmbed], components: [row] });
                } else {
                    await i.reply({ content: `❌ Bu kategori bulunamadı.`, ephemeral: true });
                }
            }
        });

        collector.on('end', () => {
            const disabledRow = ActionRowBuilder.from(row);
            disabledRow.components[0].setDisabled(true);
            msg.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};