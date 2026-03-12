const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('croxydb');

/**
 * 🎫 Luminex Ticket Sistemi
 * Buton tabanlı destek ticket yönetimi
 */

class TicketSystem {
    /**
     * Ticket paneli oluştur
     */
    async createPanel(interaction, supportRoleId) {
        const guildId = interaction.guild.id;

        // Ayarları kaydet (croxydb 0 değerini kabul etmez - sayaç ilk ticket açıldığında otomatik set edilir)
        db.set(`ticket_role_${guildId}`, supportRoleId);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Destek Talebi')
            .setDescription(
                '**📩 Yardıma mı ihtiyacın var?**\n\n' +
                'Aşağıdaki butona tıklayarak özel bir destek kanalı oluşturabilirsin.\n' +
                'Destek ekibimiz en kısa sürede yanıt verecektir.\n\n' +
                '**⚠️ Kurallar**\n' +
                '• Spam ticket açmayın\n' +
                '• Sorununuzu net bir şekilde yazın\n' +
                '• Sabırlı olun'
            )
            .setFooter({ text: 'Luminex • Ticket Sistemi' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Destek Talebi Oluştur')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return { success: true, message: '✅ Ticket paneli oluşturuldu!' };
    }

    /**
     * Ticket oluştur (buton handler)
     */
    async handleCreate(interaction) {
        const guild = interaction.guild;
        const guildId = guild.id;
        const user = interaction.user;

        // Zaten açık ticket var mı kontrol et
        const existingTicket = guild.channels.cache.find(c =>
            c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        );

        if (existingTicket) {
            return interaction.reply({
                content: `❌ Zaten açık bir ticket'ın var: ${existingTicket}`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Sayacı artır
        const counter = (db.fetch(`ticket_counter_${guildId}`) || 0) + 1;
        db.set(`ticket_counter_${guildId}`, counter);

        // Destek rolü
        const supportRoleId = db.fetch(`ticket_role_${guildId}`);

        // Ticket kategorisi bul veya oluştur
        let category = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('ticket')
        );

        if (!category) {
            try {
                category = await guild.channels.create({
                    name: '🎫 Tickets',
                    type: ChannelType.GuildCategory
                });
            } catch (e) {
                console.error('[TICKET] Kategori oluşturulamadı:', e.message);
            }
        }

        // Kanal izinleri
        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
            }
        ];

        if (supportRoleId) {
            permissionOverwrites.push({
                id: supportRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
            });
        }

        // Kanal oluştur
        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                type: ChannelType.GuildText,
                parent: category?.id,
                permissionOverwrites,
                topic: `Ticket #${counter} | Kullanıcı: ${user.tag} | Tarih: ${new Date().toLocaleDateString('tr-TR')}`
            });

            // Ticket verisini kaydet
            db.set(`ticket_data_${ticketChannel.id}`, {
                number: counter,
                userId: user.id,
                username: user.tag,
                channelId: ticketChannel.id,
                createdAt: Date.now(),
                status: 'open'
            });

            // Ticket içi mesaj (açıldığında gösterilen hoş geldin)
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`🎫 Ticket #${counter} Açıldı`)
                .setDescription(
                    `Merhaba ${user}! 👋\n\n` +
                    `Destek talebin oluşturuldu. Ekibimiz en kısa sürede burada olacak.\n` +
                    `Lütfen sorununu aşağıya detaylı yaz.\n\n` +
                    `**📌 Bilgiler**\n` +
                    `• Açan: ${user}\n` +
                    `• Tarih: ${new Date().toLocaleDateString('tr-TR')}\n` +
                    `• Numara: #${counter}`
                )
                .setFooter({ text: 'Kapatmak için aşağıdaki butonu kullan' })
                .setTimestamp();

            const closeRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Ticket\'ı Kapat')
                        .setStyle(ButtonStyle.Danger)
                );

            const messagePayload = {
                embeds: [welcomeEmbed],
                components: [closeRow]
            };
            if (supportRoleId) {
                messagePayload.content = `<@&${supportRoleId}>`;
            }

            await ticketChannel.send(messagePayload);

            await interaction.editReply({
                content: `✅ Ticket oluşturuldu: ${ticketChannel}`
            });

        } catch (error) {
            console.error('[TICKET] Kanal oluşturma hatası:', error);
            await interaction.editReply({ content: '❌ Ticket oluşturulurken bir hata oluştu.' });
        }
    }

    /**
     * Ticket kapat (buton handler)
     */
    async handleClose(interaction) {
        const channel = interaction.channel;
        const ticketData = db.fetch(`ticket_data_${channel.id}`);

        if (!ticketData) {
            return interaction.reply({ content: '❌ Bu kanal bir ticket değil.', ephemeral: true });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🔒 Ticket Kapatıldı')
                    .setDescription(
                        `Bu destek talebi **${interaction.user.tag}** tarafından kapatıldı.\n\n` +
                        `**📊 Özet**\n` +
                        `• Açan: <@${ticketData.userId}>\n` +
                        `• Numara: #${ticketData.number}\n` +
                        `• Süre: ${this.formatDuration(Date.now() - ticketData.createdAt)}\n\n` +
                        `*Kanal 10 saniye içinde silinecek.*`
                    )
                    .setFooter({ text: 'Luminex Ticket' })
                    .setTimestamp()
            ]
        });

        // Ticket verisini güncelle
        ticketData.status = 'closed';
        ticketData.closedBy = interaction.user.id;
        ticketData.closedAt = Date.now();
        db.set(`ticket_data_${channel.id}`, ticketData);

        // Ticket geçmişine ekle
        const historyKey = `ticket_history_${interaction.guild.id}`;
        let history = db.fetch(historyKey) || [];
        history.push(ticketData);
        if (history.length > 100) history = history.slice(-100);
        db.set(historyKey, history);

        // 10 saniye bekle ve sil
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (e) {
                console.error('[TICKET] Kanal silinemedi:', e.message);
            }
        }, 10000);
    }

    /**
     * Süre formatla
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} gün ${hours % 24} saat`;
        if (hours > 0) return `${hours} saat ${minutes % 60} dakika`;
        if (minutes > 0) return `${minutes} dakika`;
        return `${seconds} saniye`;
    }
}

module.exports = new TicketSystem();
