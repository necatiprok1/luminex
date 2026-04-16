/**
 * 📝 Text Utilities
 * Centralized text processing functions to avoid code duplication
 */

/**
 * Detect user intent from message
 * @param {string} message - User message
 * @returns {string} Intent type
 */
function detectIntent(message) {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('yardım') || messageLower.includes('help')) {
        return 'help_request';
    } else if (messageLower.includes('selam') || messageLower.includes('merhaba') || messageLower.includes('hey')) {
        return 'greeting';
    } else if (messageLower.includes('güle güle') || messageLower.includes('bay bay') || messageLower.includes('bye')) {
        return 'farewell';
    } else if (messageLower.includes('nedir') || messageLower.includes('nasıl') || messageLower.includes('ne zaman')) {
        return 'question_answer';
    } else if (messageLower.includes('hata') || messageLower.includes('sorun') || messageLower.includes('problem')) {
        return 'error_handling';
    } else if (messageLower.includes('ban') || messageLower.includes('kick') || messageLower.includes('timeout') || messageLower.includes('sustur')) {
        return 'moderation';
    } else if (messageLower.includes('kanal') || messageLower.includes('rol')) {
        return 'server_management';
    } else if (messageLower.includes('bilgi') || messageLower.includes('istatistik') || messageLower.includes('analiz')) {
        return 'information';
    }
    
    return 'general_chat';
}

/**
 * Extract keywords from message
 * @param {string} message - User message
 * @param {number} limit - Maximum keywords to extract
 * @returns {string[]} Array of keywords
 */
function extractKeywords(message, limit = 10) {
    const words = message.toLowerCase()
        .replace(/[^\w\sğüşiöçĞÜŞİÖÇ]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, limit);
    
    return [...new Set(words)]; // Remove duplicates
}

/**
 * Extract topics from text (keyword-based)
 * @param {string} text - Text to analyze
 * @returns {string[]} Found topics
 */
function extractTopics(text) {
    const keywords = [
        'kanal', 'channel', 'rol', 'role', 'kullanıcı', 'user', 'member',
        'mesaj', 'message', 'sunucu', 'server', 'yönet', 'manage',
        'moderasyon', 'moderation', 'ban', 'kick', 'mute', 'warn',
        'seviye', 'level', 'xp', 'ekonomi', 'economy', 'para', 'money'
    ];

    const found = [];
    const textLower = text.toLowerCase();
    for (const kw of keywords) {
        if (textLower.includes(kw)) {
            found.push(kw);
        }
    }
    return found;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text || '';
    return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Clean Discord mentions from text
 * @param {string} text - Text with mentions
 * @returns {string} Cleaned text
 */
function cleanMentions(text) {
    return text
        .replace(/<@!?(\d+)>/g, '@user')
        .replace(/<#(\d+)>/g, '#channel')
        .replace(/<@&(\d+)>/g, '@role');
}

/**
 * Check if message is worth responding to (avoid spam)
 * @param {string} message - Message to check
 * @returns {boolean} True if worth responding
 */
function isWorthResponding(message) {
    if (!message) return false;
    const cleaned = message.trim();
    // Skip very short messages like "ok", "tmm", "evet"
    if (cleaned.length <= 3) return false;
    // Skip common non-conversational responses
    const skipWords = ['ok', 'tmm', 'tamam', 'evet', 'hayır', 'hm', 'hmm', 'mmm'];
    if (skipWords.includes(cleaned.toLowerCase())) return false;
    return true;
}

module.exports = {
    detectIntent,
    extractKeywords,
    extractTopics,
    truncateText,
    cleanMentions,
    isWorthResponding
};
