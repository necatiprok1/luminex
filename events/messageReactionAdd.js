/**
 * 🔔 Message Reaction Handler
 * Process user reactions to confirmation dialogs and other interactive elements
 */

const { Events } = require('discord.js');
const confirmation = require('../utils/command-confirmation');
const aiService = require('../utils/ai-service');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        // Ignore bot reactions
        if (user.bot) return;

        // Partial reaction handling
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Reaction fetch error:', error);
                return;
            }
        }

        try {
            // Check if this is a confirmation reaction
            const result = await confirmation.processConfirmation(reaction, user);

            if (!result) return;

            if (result.result === 'wrong_user') {
                // Someone else tried to confirm - ignore politely
                return;
            }

            if (result.result === 'denied') {
                // User said no
                const denyMessage = `❌ İşlem iptal edildi.`;
                try {
                    await result.originalMessage.reply({ content: denyMessage });
                } catch (e) {
                    console.warn('[REACTION] ⚠️  Failed to send denial message:', e.message);
                }
                return;
            }

            if (result.result === 'confirmed') {
                // User confirmed - execute command
                const { command, params, originalMessage } = result;

                console.log(`[CONFIRMATION] ✅ Onaylı: ${command} ${params.join(' ')}`);
                console.log(`[CONFIRMATION] 📋 Mesaj: ${originalMessage.id}, Kullanıcı: ${originalMessage.author.tag}`);

                try {
                    // Execute the command
                    const cmd = {
                        action: command,
                        params: params,
                        command: command
                    };

                    console.log(`[CONFIRMATION] 🚀 Komut çalıştırılıyor:`, cmd);
                    
                    const executionStart = Date.now();
                    const commandResult = await aiService.executeCommand(cmd, originalMessage, originalMessage.client);
                    const executionTime = Date.now() - executionStart;
                    
                    console.log(`[CONFIRMATION] ✅ Sonuç:`, commandResult);

                    // Build response
                    const statusIcon = commandResult.success ? '✅' : '❌';
                    let response = `📋 **${command}** | ${statusIcon} ${commandResult.message}\n`;
                    response += `⏱️ ${executionTime}ms\n\n`;
                    response += `✅ **KOMUT TAMAMLANDI**`;

                    await originalMessage.reply({ content: response });

                } catch (err) {
                    console.error('[CONFIRMATION] Komut yürütme hatası:', err);
                    await originalMessage.reply({
                        content: `❌ **Komut yürütülürken hata:** ${err.message}`
                    });
                }
            }

        } catch (error) {
            console.error('[REACTION HANDLER] Error:', error);
        }
    }
};
