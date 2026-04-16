const { Events, InteractionType, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/mongodb-helper");
const cooldown = require("../utils/cooldown");
const errorHandler = require("../utils/error-handler");

module.exports = {
    name: Events.InteractionCreate,
    execute: async (interaction) => {
        const client = interaction.client;

        // ═══════════════════════════════════════
        // 🚧 BAKIM MODU
        // ═══════════════════════════════════════
        const bakimModu = await db.fetch('bakım');
        if (bakimModu) {
            if (!['1145367633370288189', '988678929307033651'].includes(interaction.user.id)) {
                const bakımmodu = new EmbedBuilder()
                    .setTitle('🚧 Botumuz Bakımda 🚧')
                    .setDescription('🔧 Herhangi bir sorununuz varsa <@1145367633370288189> ile iletişime geçiniz.')
                    .setColor('#FEE75C');
                return interaction.reply({ embeds: [bakımmodu], flags: 64 });
            }
        }

        // ═══════════════════════════════════════
        // 📈 ANALİTİK: ETKİLEŞİM TAKİBİ
        // ═══════════════════════════════════════
        try {
            if (interaction.guild) {
                const analytics = require('../utils/analytics-system');
                if (interaction.isCommand()) {
                    analytics.trackCommand(interaction);
                } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
                    analytics.trackInteraction(interaction);
                }
            }
        } catch {}

        // ═══════════════════════════════════════
        // 🎮 SLASH KOMUTLAR
        // ═══════════════════════════════════════
        if (interaction.type === InteractionType.ApplicationCommand) {
            if (interaction.user.bot) return;

            const command = client.slashcommands.get(interaction.commandName);
            if (!command) {
                console.error(`[COMMAND ERROR] Komut bulunamadı: ${interaction.commandName} | Kullanıcı: ${interaction.user.tag}`);
                const notFoundEmbed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('❌ Komut Bulunamadı')
                    .setDescription(`\`/${interaction.commandName}\` komutu sistemde kayıtlı değil.\n\n📖 Kullanılabilir komutları görmek için \`/yardım\` yazın.`);
                try {
                    return interaction.reply({ embeds: [notFoundEmbed], flags: 64 });
                } catch (err) {
                    console.error('[COMMAND ERROR] Komut bulunamadı hatası gönderilemedi:', err.message);
                }
                return;
            }

            // ⏱️ Cooldown Kontrolü
            const remaining = cooldown.check(interaction.commandName, interaction.user.id);
            if (remaining !== null) {
                const cooldownEmbed = cooldown.getCooldownEmbed(interaction.commandName, remaining);
                return interaction.reply({ embeds: [cooldownEmbed], flags: 64 });
            }

            // 🛡️ Güvenli Çalıştırma
            await errorHandler.safeExecute(interaction, async () => {
                await command.run(client, interaction);
            });
        }

        // ═══════════════════════════════════════
        // 🔘 BUTON ETKİLEŞİMLERİ
        // ═══════════════════════════════════════
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // 🎫 Ticket Sistemi
            const sendError = async (content) => {
                try {
                    if (interaction.deferred || interaction.replied) await interaction.followUp({ content, flags: 64 });
                    else await interaction.reply({ content, flags: 64 });
                } catch (err) {
                    console.warn('[INTERACTION] ⚠️  Failed to send error message:', err.message);
                }
            };

            if (customId === 'ticket_create') {
                try {
                    const ticketSystem = require('../utils/ticket-system');
                    await ticketSystem.handleCreate(interaction);
                } catch (e) {
                    console.error('[TICKET] Hata:', e.message);
                    await sendError('❌ Ticket oluşturulamadı.');
                }
                return;
            }

            if (customId === 'ticket_close') {
                try {
                    const ticketSystem = require('../utils/ticket-system');
                    await ticketSystem.handleClose(interaction);
                } catch (e) {
                    console.error('[TICKET] Hata:', e.message);
                    await sendError('❌ Ticket kapatılamadı.');
                }
                return;
            }

            // 🎉 Çekiliş Sistemi
            if (customId === 'giveaway_join') {
                try {
                    const giveawaySystem = require('../utils/giveaway-system');
                    await giveawaySystem.handleJoin(interaction);
                } catch (e) {
                    console.error('[GIVEAWAY] Hata:', e.message, e.stack);
                    try {
                        if (interaction.deferred) {
                            await interaction.editReply({ content: '❌ Çekilişe katılırken bir hata oluştu.' }).catch(() => {});
                        } else {
                            await interaction.reply({ content: '❌ Çekilişe katılırken bir hata oluştu.', flags: 64 }).catch(() => {});
                        }
                    } catch (replyErr) {
                        console.error('[GIVEAWAY] Hata yanıtı bile gönderilemedi:', replyErr.message);
                    }
                }
                return;
            }
            if (customId === 'giveaway_ended') {
                return interaction.reply({ content: 'Bu çekiliş sona erdi.', flags: 64 }).catch(() => {});
            }

            // ✊ Taş Kağıt Makas
            if (customId.startsWith('rps_')) {
                // Bu kısmı Phase 9'da implemente edeceğiz
                return;
            }
        }

        // ═══════════════════════════════════════
        // 📋 SELECT MENU ETKİLEŞİMLERİ
        // ═══════════════════════════════════════
        if (interaction.isStringSelectMenu()) {
            // Yardım menüsü zaten kendi collector'ında ele alınıyor
            // Mağaza sistemi vb. burada ele alınacak (Phase 3)
        }

        // ═══════════════════════════════════════
        // 🔍 AUTOCOMPLETE
        // ═══════════════════════════════════════
        if (interaction.isAutocomplete()) {
            const command = client.slashcommands.get(interaction.commandName);
            if (command && command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (e) {
                    console.error('[AUTOCOMPLETE] Hata:', e.message);
                }
            }
        }
    },
};
