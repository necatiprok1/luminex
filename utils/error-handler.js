const { EmbedBuilder, WebhookClient } = require('discord.js');
const chalk = require('chalk');

/**
 * 🛡️ Luminex Error Handler
 * Merkezi hata yönetimi ve loglama sistemi
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.webhook = null;

        // Webhook varsa başlat
        if (process.env.ERROR_WEBHOOK_URL) {
            try {
                this.webhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
            } catch (e) {
                console.error(chalk.red('[ERROR HANDLER] Webhook başlatılamadı'));
            }
        }
    }

    /**
     * Global process hataları yakala
     */
    init() {
        process.on('unhandledRejection', (reason, promise) => {
            this.log('UnhandledRejection', reason);
            console.error(chalk.red('[UNHANDLED REJECTION]'), reason);
        });

        process.on('uncaughtException', (error) => {
            this.log('UncaughtException', error);
            console.error(chalk.red('[UNCAUGHT EXCEPTION]'), error);
        });

        process.on('warning', (warning) => {
            console.warn(chalk.yellow('[WARNING]'), warning.name, warning.message);
        });

        console.log(chalk.green('[ERROR HANDLER] ✅ Merkezi hata yönetimi aktif'));
    }

    /**
     * Hata logla
     */
    log(type, error) {
        const entry = {
            type,
            message: error?.message || String(error),
            stack: error?.stack || '',
            timestamp: Date.now()
        };

        this.errorLog.push(entry);

        // Log boyutunu kontrol et
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        // Webhook bildirim
        this.notifyWebhook(entry);
    }

    /**
     * Webhook ile hata bildirimi
     */
    async notifyWebhook(entry) {
        if (!this.webhook) return;

        try {
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(`🚨 ${entry.type}`)
                .setDescription(`\`\`\`\n${entry.message.slice(0, 1000)}\n\`\`\``)
                .setTimestamp();

            if (entry.stack) {
                embed.addFields({
                    name: '📋 Stack Trace',
                    value: `\`\`\`\n${entry.stack.slice(0, 1000)}\n\`\`\``
                });
            }

            await this.webhook.send({ embeds: [embed] });
        } catch (e) {
            // Webhook hatası — sessizce geç
        }
    }

    /**
     * Komut çalıştırma wrapper'ı
     * Komutu güvenli bir şekilde çalıştırır, hata olursa yakalar
     */
    async safeExecute(interaction, callback) {
        try {
            await callback();
        } catch (error) {
            this.log('CommandError', error);
            const errorText = (typeof error === 'object' && error && error.message) ? error.message : String(error);
            console.error(chalk.red(`[COMMAND ERROR] /${interaction.commandName}:`), errorText);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Bir Hata Oluştu')
                .setDescription('Komut çalıştırılırken beklenmeyen bir hata meydana geldi.')
                .addFields({ name: '🔧 Hata', value: `\`${errorText.slice(0, 200)}\`` })
                .setFooter({ text: 'Bu hata otomatik olarak kaydedildi.' })
                .setTimestamp();

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
            } catch (replyError) {
                // Yanıt gönderilemiyorsa bile sessizce devam et
            }
        }
    }

    /**
     * Son hataları getir
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(-count);
    }
}

module.exports = new ErrorHandler();
