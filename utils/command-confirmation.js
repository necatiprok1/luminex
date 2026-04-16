/**
 * 🔔 Command Confirmation System
 * Ask for user confirmation before executing commands with preview
 */

// Track pending confirmations: messageId -> { userId, command, params, expires }
const pendingConfirmations = new Map();

// Confirmation timeout (30 seconds)
const CONFIRMATION_TIMEOUT = 30000;

/**
 * Format parameter for display - resolve Discord mentions/channels when possible
 */
function formatParameterDisplay(param, command, guild) {
    if (!param) return '(boş)';
    
    // If it looks like a Discord mention
    if (param.startsWith('<@') && param.endsWith('>')) {
        return param; // Already formatted as mention
    }
    
    // If starts with @ or #, try to resolve
    if (param.startsWith('@')) {
        return `🧑 ${param.slice(1)}`; // User reference
    }
    if (param.startsWith('#')) {
        return `📢 ${param.slice(1)}`; // Channel reference
    }
    
    // Number literals
    if (!isNaN(param) && param.trim() !== '') {
        const num = parseInt(param);
        if (command.includes('timeout') || command.includes('sil')) {
            return `${num} ${command.includes('timeout') ? 'dakika' : 'mesaj'}`;
        }
        return num.toString();
    }
    
    // For text params (reasons, announcements, etc.)
    if (param.length > 50) {
        return `"${param.slice(0, 50)}..."`; // Truncate long text
    }
    
    return `"${param}"`;
}

/**
 * REQUEST COMMAND CONFIRMATION
 * Show user what will happen, wait for yes/no
 */
async function requestConfirmation(message, command, params, preview) {
    const responseTemplate = require('./ai_response_template');
    const dataFormatter = require('./data-formatter');

    // Build confirmation message
    let confirmMsg = `🔔 **KOMUT YAPTI ONASI GEREKL**\n`;
    confirmMsg += `${'─'.repeat(50)}\n\n`;
    confirmMsg += `📋 **KOMUT**: \`${command}\`\n\n`;
    confirmMsg += `📦 **PARAMETRELER**:\n`;
    
    if (Array.isArray(params) && params.length > 0) {
        params.forEach((p, i) => {
            const formatted = formatParameterDisplay(p, command, message.guild);
            confirmMsg += `   ${i + 1}. ${formatted}\n`;
        });
    } else {
        confirmMsg += `   (Yok)\n`;
    }
    confirmMsg += '\n';

    if (preview) {
        confirmMsg += `👀 **TAHMİNİ SONUÇ**:\n`;
        confirmMsg += `   ${preview}\n\n`;
    }

    confirmMsg += `⚠️ **Devam etmek ister misiniz?**\n`;
    confirmMsg += `✅ **EVET** için: ✔️ react\n`;
    confirmMsg += `❌ **HAYIR** için: ❌ react\n\n`;
    confirmMsg += `⏱️ (30 saniye içinde cevap verin)`;

    // Send confirmation message
    const confirmMessage = await message.reply({ content: confirmMsg });

    // Add reactions
    try {
        await confirmMessage.react('✔️');
        await confirmMessage.react('❌');
    } catch (e) {
        console.error('Reaction error:', e);
    }

    // Store pending confirmation
    const confirmationId = confirmMessage.id;
    pendingConfirmations.set(confirmationId, {
        userId: message.author.id,
        command: command,
        params: params,
        originalMessage: message,
        confirmMessage: confirmMessage,
        createdAt: Date.now()
    });

    // Auto-cleanup after timeout
    setTimeout(() => {
        if (pendingConfirmations.has(confirmationId)) {
            pendingConfirmations.delete(confirmationId);
            confirmMessage.edit({ content: confirmMsg + '\n\n⏰ **ZAMAN DOLDU** - Onay geçersiz' }).catch(() => {});
        }
    }, CONFIRMATION_TIMEOUT);

    return confirmationId;
}

/**
 * PROCESS CONFIRMATION REACTION
 * Called when user reacts to confirmation message
 */
async function processConfirmation(reaction, user) {
    const confirmationId = reaction.message.id;
    const confirmation = pendingConfirmations.get(confirmationId);

    if (!confirmation) return null;

    // Check it's the right user
    if (user.id !== confirmation.userId) {
        return { result: 'wrong_user' };
    }

    // Check reaction
    if (reaction.emoji.name === '✔️' || reaction.emoji.name === '✓') {
        pendingConfirmations.delete(confirmationId);
        return {
            result: 'confirmed',
            command: confirmation.command,
            params: confirmation.params,
            originalMessage: confirmation.originalMessage
        };
    } else if (reaction.emoji.name === '❌') {
        pendingConfirmations.delete(confirmationId);
        return {
            result: 'denied',
            originalMessage: confirmation.originalMessage
        };
    }

    return null;
}

/**
 * GET PENDING CONFIRMATION
 * Check if a reaction is for a pending confirmation
 */
function getPendingConfirmation(messageId) {
    return pendingConfirmations.get(messageId) || null;
}

/**
 * CANCEL CONFIRMATION
 * Remove a pending confirmation (timeout, etc)
 */
function cancelConfirmation(confirmationId) {
    return pendingConfirmations.delete(confirmationId);
}

/**
 * GET ALL PENDING CONFIRMATIONS
 * For debugging/stats
 */
function getAllPending() {
    return Array.from(pendingConfirmations.values());
}

/**
 * CLEANUP EXPIRED CONFIRMATIONS
 * Run periodically to clean up stale confirmations
 */
function cleanupExpired() {
    const now = Date.now();
    let removed = 0;

    for (const [id, data] of pendingConfirmations.entries()) {
        if (now - data.createdAt > CONFIRMATION_TIMEOUT) {
            pendingConfirmations.delete(id);
            removed++;
        }
    }

    if (removed > 0) {
        console.log(`[CONFIRMATION] Cleaned up ${removed} expired confirmations`);
    }

    return removed;
}

// Run cleanup every 60 seconds
setInterval(cleanupExpired, 60000);

module.exports = {
    requestConfirmation,
    processConfirmation,
    getPendingConfirmation,
    cancelConfirmation,
    getAllPending,
    cleanupExpired,
    CONFIRMATION_TIMEOUT
};
