/**
 * 🎨 AI Response Template Engine
 * Standardized response formatting for professional, expert-level output
 * Handles: Reports, Confirmations, Errors, Analysis, Suggestions
 */

const { EmbedBuilder } = require('discord.js');

/**
 * INFO REPORT TEMPLATE
 * Used for comprehensive information responses with analysis and recommendations
 */
function generateInfoReport(title, data) {
    if (!title || !data) return null;

    let report = `🔍 ${title.toUpperCase()}\n`;
    report += `${'─'.repeat(50)}\n\n`;

    // 1. OVERVIEW SECTION
    if (data.overview) {
        report += `📋 GENEL ÖZET\n`;
        if (typeof data.overview === 'string') {
            report += `${data.overview}\n\n`;
        } else {
            Object.entries(data.overview).forEach(([key, value]) => {
                report += `  • **${key}**: ${value}\n`;
            });
            report += '\n';
        }
    }

    // 2. KEY STATISTICS SECTION
    if (data.stats) {
        report += `📊 TEMEL İSTATİSTİKLER\n`;
        Object.entries(data.stats).forEach(([key, value]) => {
            const emoji = getStatEmoji(key);
            report += `  ${emoji} **${key}**: ${value}\n`;
        });
        report += '\n';
    }

    // 3. DETAILED ANALYSIS
    if (data.analysis) {
        report += `⚡ ANALİZ\n`;
        if (typeof data.analysis === 'string') {
            report += `${data.analysis}\n\n`;
        } else {
            Object.entries(data.analysis).forEach(([category, items]) => {
                report += `  **${category}:**\n`;
                if (Array.isArray(items)) {
                    items.forEach(item => report += `    ✓ ${item}\n`);
                } else {
                    report += `    ${items}\n`;
                }
            });
            report += '\n';
        }
    }

    // 4. HEALTH/SCORE
    if (data.health !== undefined) {
        const score = data.health;
        const status = score >= 80 ? '✅ Excellent' : score >= 60 ? '🟡 Good' : '⚠️ Needs Attention';
        report += `📈 SAĞLIK DURUMU\n  Skor: ${score}/100 ${status}\n\n`;
    }

    // 5. RECOMMENDATIONS
    if (data.recommendations && data.recommendations.length > 0) {
        report += `💡 ÖNERİLER\n`;
        data.recommendations.forEach((rec, idx) => {
            report += `  ${idx + 1}. ${rec}\n`;
        });
        report += '\n';
    }

    // 6. NEXT STEPS / SUGGESTIONS
    if (data.suggestions && data.suggestions.length > 0) {
        report += `🎯 SONRAKI ADIMLAR\n`;
        data.suggestions.forEach(sug => {
            report += `  → ${sug}\n`;
        });
        report += '\n';
    }

    return report.trim();
}

/**
 * COMMAND CONFIRMATION TEMPLATE
 * Ask user before executing commands with clear preview
 */
function generateConfirmation(command, params, preview) {
    let confirm = `🔔 KOMUT ONASI GEREKLİ\n`;
    confirm += `${'─'.repeat(50)}\n\n`;
    
    confirm += `📋 KOMUT: **${command}**\n`;
    confirm += `📦 PARAMETRELER:\n`;
    
    if (Array.isArray(params)) {
        params.forEach((p, i) => {
            confirm += `  ${i + 1}. \`${p}\`\n`;
        });
    }
    confirm += '\n';

    if (preview) {
        confirm += `👀 BEKLENEN SONUÇ:\n`;
        confirm += `  ${preview}\n\n`;
    }

    confirm += `⚠️ Devam etmek ister misiniz?\n`;
    confirm += `✅ **EVET** için ✔️ reaction\n`;
    confirm += `❌ **HAYIR** için ❌ reaction\n\n`;
    confirm += `(30 saniye içinde cevap verin)`;

    return confirm;
}

/**
 * ERROR REPORT TEMPLATE
 * Beautiful error messages with context and suggestions
 */
function generateErrorReport(errorType, message, suggestions = []) {
    let error = `❌ HATA OLUŞTU\n`;
    error += `${'─'.repeat(50)}\n\n`;

    error += `🔴 HAD TIPI: **${errorType}**\n`;
    error += `📌 DETAY: ${message}\n\n`;

    if (suggestions.length > 0) {
        error += `💡 NE YAPMAN GEREKİĞİ:\n`;
        suggestions.forEach(sug => {
            error += `  → ${sug}\n`;
        });
        error += '\n';
    }

    error += `🆘 Hâlâ sorun yaşıyorsanız, bot geliştricisine iletişim geçin.`;

    return error;
}

/**
 * ANALYSIS REPORT TEMPLATE
 * Data-driven insights with visualizations
 */
function generateAnalysisReport(title, data) {
    let analysis = `📊 ${title}\n`;
    analysis += `${'─'.repeat(50)}\n\n`;

    // SUMMARY
    if (data.summary) {
        analysis += `📋 ÖZETİ\n${data.summary}\n\n`;
    }

    // BREAKDOWN WITH STRUCTURE
    if (data.breakdown) {
        analysis += `📈 DETAYLI AYIRINTI\n`;
        Object.entries(data.breakdown).forEach(([category, items]) => {
            analysis += `  **${category}:**\n`;
            if (Array.isArray(items)) {
                items.forEach((item, idx) => {
                    const indicator = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▪️';
                    analysis += `    ${indicator} ${item}\n`;
                });
            } else {
                analysis += `    ${items}\n`;
            }
        });
        analysis += '\n';
    }

    // KEY FINDINGS
    if (data.findings && data.findings.length > 0) {
        analysis += `🎯 TEMEL BULGULAR\n`;
        data.findings.forEach(finding => {
            analysis += `  ✓ ${finding}\n`;
        });
        analysis += '\n';
    }

    // CONCLUSION & ACTIONS
    if (data.conclusion) {
        analysis += `📌 SONUÇ\n${data.conclusion}`;
    }

    return analysis;
}

/**
 * SUGGESTION LIST TEMPLATE
 * Smart next-step recommendations
 */
function generateSuggestions(context, suggestions) {
    let suggest = `\n\n💡 YAPABILECEKLER:\n`;
    suggest += `${'─'.repeat(50)}\n`;

    suggestions.forEach((sug, idx) => {
        const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const icon = icons[idx] || (idx + 1);
        suggest += `\n**${icon} ${sug.title}**\n`;
        suggest += `   ${sug.description}\n`;
        if (sug.command) {
            suggest += `   💬 Söyle: "${sug.command}"\n`;
        }
    });

    return suggest;
}

/**
 * COMMAND RESULT REPORT
 * Show what command did with before/after
 */
function generateCommandResult(command, success, before, after, details) {
    let result = `📋 KOMUT SONUCU\n`;
    result += `${'─'.repeat(40)}\n`;
    result += `🔧 KOMUT: **${command}**\n`;
    result += `${success ? '✅ DURUM: BAŞARILI' : '❌ DURUM: BAŞARISIZ'}\n\n`;

    if (before && after) {
        result += `ÖNCE → SONRA\n`;
        result += `┌─ ${before}\n`;
        result += `└─ ${after}\n\n`;
    }

    if (details) {
        result += `📊 DETAYLAR\n`;
        if (typeof details === 'string') {
            result += `${details}\n`;
        } else {
            Object.entries(details).forEach(([key, val]) => {
                result += `  • ${key}: ${val}\n`;
            });
        }
    }

    return result;
}

/**
 * HELPER: Get emoji for stat type
 */
function getStatEmoji(statName) {
    const emojiMap = {
        'üyeler': '👥',
        'kanallar': '📢',
        'roller': '🎭',
        'mesajlar': '💬',
        'uptime': '⏱️',
        'bellek': '💾',
        'model': '🤖',
        'hız': '⚡',
        'durum': '📡'
    };

    const lower = statName.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (lower.includes(key)) return emoji;
    }
    return '📌';
}

/**
 * FORMAT FOR DISCORD
 * Ensure response fits 2000 char limit
 */
function formatForDiscord(text, maxLength = 2000) {
    if (!text) return null;
    
    if (text.length <= maxLength) {
        return [text];
    }

    // If too long, split by sections
    const lines = text.split('\n');
    const chunks = [];
    let current = '';

    for (const line of lines) {
        if ((current + line + '\n').length > maxLength) {
            if (current) chunks.push(current.trim());
            current = line + '\n';
        } else {
            current += line + '\n';
        }
    }

    if (current) chunks.push(current.trim());
    return chunks;
}

/**
 * CREATE EMBED FOR RICH FORMATTING
 * Color-coded by type
 */
function createEmbed(type = 'info', title, data) {
    const colorMap = {
        'info': '#0099ff',      // Blue
        'success': '#00ff00',   // Green
        'warning': '#ff9900',   // Orange
        'error': '#ff0000',     // Red
        'analysis': '#9933ff'   // Purple
    };

    const emojiMap = {
        'info': '🔍',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'analysis': '📊'
    };

    const embed = new EmbedBuilder()
        .setColor(colorMap[type] || colorMap.info)
        .setTitle(`${emojiMap[type]} ${title}`)
        .setTimestamp();

    if (data.description) {
        embed.setDescription(data.description);
    }

    if (data.fields) {
        data.fields.forEach(field => {
            embed.addField(field.name, field.value, field.inline !== false);
        });
    }

    if (data.thumbnail) {
        embed.setThumbnail(data.thumbnail);
    }

    if (data.footer) {
        embed.setFooter({ text: data.footer });
    }

    return embed;
}

module.exports = {
    generateInfoReport,
    generateConfirmation,
    generateErrorReport,
    generateAnalysisReport,
    generateSuggestions,
    generateCommandResult,
    formatForDiscord,
    createEmbed
};
