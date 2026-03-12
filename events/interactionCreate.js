const { Events, InteractionType, EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const db = require("croxydb");
const cooldown = require("../utils/cooldown");
const errorHandler = require("../utils/error-handler");

module.exports = {
    name: Events.InteractionCreate,
    execute: async (interaction) => {
        const client = interaction.client;

        // ═══════════════════════════════════════
        // 🚧 BAKIM MODU
        // ═══════════════════════════════════════
        if (db.fetch('bakım')) {
            if (!['1145367633370288189', '988678929307033651'].includes(interaction.user.id)) {
                const bakımmodu = new EmbedBuilder()
                    .setTitle('🚧 Botumuz Bakımda 🚧')
                    .setDescription('🔧 Herhangi bir sorununuz varsa <@1145367633370288189> ile iletişime geçiniz.')
                    .setColor('#FEE75C');
                return interaction.reply({ embeds: [bakımmodu], ephemeral: true });
            }
        }

        // ═══════════════════════════════════════
        // 🎮 SLASH KOMUTLAR
        // ═══════════════════════════════════════
        if (interaction.type === InteractionType.ApplicationCommand) {
            if (interaction.user.bot) return;

            const command = client.slashcommands.get(interaction.commandName);
            if (!command) return;

            // ⏱️ Cooldown Kontrolü
            const remaining = cooldown.check(interaction.commandName, interaction.user.id);
            if (remaining !== null) {
                const cooldownEmbed = cooldown.getCooldownEmbed(interaction.commandName, remaining);
                return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
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
                    if (interaction.deferred || interaction.replied) await interaction.followUp({ content, ephemeral: true });
                    else await interaction.reply({ content, ephemeral: true });
                } catch (_) {}
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
                            await interaction.reply({ content: '❌ Çekilişe katılırken bir hata oluştu.', ephemeral: true }).catch(() => {});
                        }
                    } catch (replyErr) {
                        console.error('[GIVEAWAY] Hata yanıtı bile gönderilemedi:', replyErr.message);
                    }
                }
                return;
            }
            if (customId === 'giveaway_ended') {
                return interaction.reply({ content: 'Bu çekiliş sona erdi.', ephemeral: true }).catch(() => {});
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
