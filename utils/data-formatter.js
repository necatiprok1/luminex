/**
 * 📊 Data Formatter
 * Convert arrays/objects to readable Discord-friendly formats
 * Handles: Tables, Lists, Statistics, Comparisons
 */

/**
 * FORMAT AS TABLE
 * ASCII table for structured data display
 */
function formatTable(headers, rows) {
    if (!headers || !rows || rows.length === 0) return null;

    // Calculate column widths
    const widths = headers.map((h, i) => {
        const maxRowWidth = Math.max(...rows.map(row => String(row[i] || '').length));
        return Math.max(h.length, maxRowWidth);
    });

    // Draw table
    let table = '';

    // Header
    table += '┌─ ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' ─┐\n';
    table += '│  ' + headers.map((h, i) => h.padEnd(widths[i])).join(' │ ') + '  │\n';
    table += '├─ ' + widths.map(w => '─'.repeat(w)).join('─┼─') + ' ─┤\n';

    // Rows
    rows.forEach((row, idx) => {
        const line = row.map((cell, i) => String(cell || '').padEnd(widths[i])).join(' │ ');
        table += '│  ' + line + '  │\n';
    });

    // Footer
    table += '└─ ' + widths.map(w => '─'.repeat(w)).join('─┴─') + ' ─┘\n';

    return '```\n' + table + '```';
}

/**
 * FORMAT AS LIST
 * Bullet points or numbered list
 */
function formatList(items, options = {}) {
    const { 
        numbered = false, 
        indent = 2,
        checkmarks = false 
    } = options;

    if (!items || items.length === 0) return null;

    const space = ' '.repeat(indent);
    let list = '';

    items.forEach((item, idx) => {
        let bullet;
        if (numbered) {
            bullet = `${idx + 1}.`;
        } else if (checkmarks) {
            bullet = '✓';
        } else {
            bullet = '•';
        }

        list += `${space}${bullet} ${item}\n`;
    });

    return list.trim();
}

/**
 * FORMAT AS STATISTICS
 * Display stats with nice formatting
 */
function formatStats(stats, options = {}) {
    const { showTrend = true, showPercent = false } = options;

    if (!stats || Object.keys(stats).length === 0) return null;

    let formatted = '';

    Object.entries(stats).forEach(([label, value]) => {
        const emoji = getStatEmoji(label);
        let line = `${emoji} **${label}**: `;

        if (typeof value === 'object') {
            // If value is {current, previous}
            const current = value.current || value[0] || 0;
            const previous = value.previous || value[1] || 0;
            
            line += `${current}`;
            
            if (showTrend && previous) {
                const change = current - previous;
                if (change > 0) {
                    line += ` ⬆️ +${change}`;
                } else if (change < 0) {
                    line += ` ⬇️ ${change}`;
                } else {
                    line += ` → Aynı`;
                }
            }

            if (showPercent && previous) {
                const percent = ((current / previous) * 100 - 100).toFixed(1);
                line += ` (${percent}%)`;
            }
        } else {
            line += `${value}`;
        }

        formatted += line + '\n';
    });

    return formatted.trim();
}

/**
 * FORMAT BEFORE/AFTER COMPARISON
 */
function formatComparison(before, after, title = '') {
    let comp = '';
    
    if (title) {
        comp += `📊 ${title}\n`;
        comp += `${'─'.repeat(30)}\n\n`;
    }

    comp += `**ÖNCE**\n`;
    if (typeof before === 'string') {
        comp += `  ${before}\n\n`;
    } else {
        Object.entries(before).forEach(([key, val]) => {
            comp += `  • ${key}: ${val}\n`;
        });
        comp += '\n';
    }

    comp += `**SONRA**\n`;
    if (typeof after === 'string') {
        comp += `  ${after}\n`;
    } else {
        Object.entries(after).forEach(([key, val]) => {
            comp += `  • ${key}: ${val}\n`;
        });
    }

    return comp;
}

/**
 * FORMAT ROLE/PERMISSION BREAKDOWN
 */
function formatRoles(roles) {
    if (!roles || roles.length === 0) return null;

    let formatted = '';

    roles.forEach((role, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▪️';
        
        formatted += `${medal} **${role.name}**\n`;
        
        if (role.description) {
            formatted += `   📌 ${role.description}\n`;
        }

        if (role.permissions && role.permissions.length > 0) {
            formatted += `   🔑 İzinler: ${role.permissions.slice(0, 3).join(', ')}`;
            if (role.permissions.length > 3) {
                formatted += ` +${role.permissions.length - 3} more`;
            }
            formatted += '\n';
        }

        formatted += '\n';
    });

    return formatted.trim();
}

/**
 * FORMAT MEMBER BREAKDOWN
 */
function formatMemberBreakdown(members) {
    if (!members) return null;

    const bots = members.filter(m => m.bot).length;
    const humans = members.length - bots;
    const online = members.filter(m => m.presence?.status === 'online').length;

    let breakdown = '';
    breakdown += `👥 **Toplam Üyeler**: ${members.length}\n`;
    breakdown += `   👤 Gerçek Kullanıcılar: ${humans}\n`;
    breakdown += `   🤖 Botlar: ${bots}\n`;
    breakdown += `   🟢 Çevrimiçi: ${online}\n`;

    return breakdown;
}

/**
 * FORMAT CHANNEL BREAKDOWN
 */
function formatChannelBreakdown(channels) {
    if (!channels) return null;

    const byType = {};
    channels.forEach(ch => {
        const type = ch.type || 'text';
        if (!byType[type]) byType[type] = [];
        byType[type].push(ch);
    });

    let breakdown = '';
    breakdown += `📢 **Toplam Kanallar**: ${channels.length}\n`;

    Object.entries(byType).forEach(([type, chans]) => {
        const emoji = type === 'voice' ? '🎤' : type === 'category' ? '📁' : '💬';
        breakdown += `   ${emoji} ${capitalizeFirst(type)}: ${chans.length}\n`;
    });

    return breakdown;
}

/**
 * FORMAT COMMAND LIST
 * Show available commands nicely
 */
function formatCommandList(commands) {
    if (!commands || commands.length === 0) return null;

    let list = '';
    commands.forEach((cmd, idx) => {
        list += `${idx + 1}. **${cmd.name}**\n`;
        if (cmd.description) {
            list += `   ${cmd.description}\n`;
        }
        if (cmd.usage) {
            list += `   💬 Kullanım: \`${cmd.usage}\`\n`;
        }
        list += '\n';
    });

    return list.trim();
}

/**
 * FORMAT HEALTH SCORE
 * Visual representation of health/status
 */
function formatHealthScore(score) {
    if (score === undefined) return null;

    // Create bar (10 blocks)
    const filled = Math.round(score / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const status = score >= 80 ? '✅ Excellent' : 
                   score >= 60 ? '🟡 Good' : 
                   score >= 40 ? '⚠️ Fair' : 
                   '❌ Poor';

    return `${'━'.repeat(15)}\n[${bar}] ${score}/100\n${status}\n${'━'.repeat(15)}`;
}

/**
 * FORMAT ERROR WITH SUGGESTIONS
 */
function formatErrorWithSuggestions(error, suggestions = []) {
    let formatted = `❌ **ERROR**: ${error}\n\n`;

    if (suggestions.length > 0) {
        formatted += `💡 **Tavsiyeler**:\n`;
        suggestions.forEach((sug, idx) => {
            formatted += `${idx + 1}. ${sug}\n`;
        });
    }

    return formatted;
}

/**
 * HELPER: Get stat emoji
 */
function getStatEmoji(statName) {
    const name = String(statName).toLowerCase();
    
    const emojiMap = {
        'üyeler': '👥',
        'members': '👥',
        'kanallar': '📢',
        'channels': '📢',
        'roller': '🎭',
        'roles': '🎭',
        'mesajlar': '💬',
        'messages': '💬',
        'uptime': '⏱️',
        'bellek': '💾',
        'memory': '💾',
        'model': '🤖',
        'hız': '⚡',
        'speed': '⚡',
        'durum': '📡',
        'status': '📡'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (name.includes(key)) return emoji;
    }
    
    return '📌';
}

/**
 * HELPER: Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * TRUNCATE TEXT
 * Ensure text doesn't exceed max length
 */
function truncate(text, maxLength = 1024, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

module.exports = {
    formatTable,
    formatList,
    formatStats,
    formatComparison,
    formatRoles,
    formatMemberBreakdown,
    formatChannelBreakdown,
    formatCommandList,
    formatHealthScore,
    formatErrorWithSuggestions,
    getStatEmoji,
    capitalizeFirst,
    truncate
};
