/**
 * 🧠 Session Context Memory
 * Remember conversation context within connected session
 * Track: last commands, topics, questions, user preferences
 */

// Per-guild session context
const sessionContexts = new Map();

const DEFAULT_CONTEXT = {
    guildId: null,
    userId: null,
    lastCommands: [],      // Last 10 executed commands
    lastQuestion: null,    // Last question asked
    currentTopic: null,    // What we're discussing
    userPreferences: {},   // User's discovered preferences
    relatedQuestions: [],  // Questions asked in this session
    sessionStart: Date.now(),
    lastActivity: Date.now()
};

/**
 * INITIALIZE SESSION
 * Create new session for guild + user
 */
function initSession(guildId, userId) {
    const sessionKey = `${guildId}:${userId}`;
    
    if (!sessionContexts.has(sessionKey)) {
        sessionContexts.set(sessionKey, {
            ...DEFAULT_CONTEXT,
            guildId: guildId,
            userId: userId,
            sessionStart: Date.now()
        });
    }

    updateActivity(guildId, userId);
    return sessionContexts.get(sessionKey);
}

/**
 * GET SESSION
 */
function getSession(guildId, userId) {
    const sessionKey = `${guildId}:${userId}`;
    return sessionContexts.get(sessionKey) || initSession(guildId, userId);
}

/**
 * ADD COMMAND TO HISTORY
 */
function addCommand(guildId, userId, command, params, result) {
    const session = getSession(guildId, userId);
    
    session.lastCommands.unshift({
        command: command,
        params: params,
        result: result?.success ? '✅' : '❌',
        timestamp: Date.now()
    });

    // Keep only last 10
    if (session.lastCommands.length > 10) {
        session.lastCommands.pop();
    }

    updateActivity(guildId, userId);
}

/**
 * ADD QUESTION/TOPIC
 */
function setTopic(guildId, userId, topic, question) {
    const session = getSession(guildId, userId);
    
    session.currentTopic = topic;
    session.lastQuestion = question;
    session.relatedQuestions.push({
        question: question,
        timestamp: Date.now()
    });

    updateActivity(guildId, userId);
}

/**
 * GET CONTEXT FOR RESPONSE
 * Build context string for AI to use in responses
 */
function getContextString(guildId, userId) {
    const session = getSession(guildId, userId);
    
    let context = '';

    // Recent commands
    if (session.lastCommands.length > 0) {
        context += `\n[SESSION] Son komutlar: ${session.lastCommands
            .slice(0, 3)
            .map(c => `${c.command}${c.result}`)
            .join(', ')}`;
    }

    // Current topic
    if (session.currentTopic) {
        context += `\n[SESSION] Mevcut konu: ${session.currentTopic}`;
    }

    // Related questions
    if (session.relatedQuestions.length > 1) {
        context += `\n[SESSION] İlgili sorular sorulmuş (${session.relatedQuestions.length})`;
    }

    return context;
}

/**
 * GET SESSION SUMMARY
 * Show what happened so far in session
 */
function getSessionSummary(guildId, userId) {
    const session = getSession(guildId, userId);
    const uptime = Math.floor((Date.now() - session.sessionStart) / 1000);
    
    let summary = `📊 **SESSION ÖZETI**\n`;
    summary += `${'─'.repeat(40)}\n`;
    summary += `⏱️ Süre: ${uptime}s\n`;
    summary += `📋 Komutlar: ${session.lastCommands.length}\n`;
    summary += `❓ Sorular: ${session.relatedQuestions.length}\n`;
    
    if (session.currentTopic) {
        summary += `🎯 Konu: ${session.currentTopic}\n`;
    }

    if (session.lastCommands.length > 0) {
        summary += `\n📈 Son Komutlar:\n`;
        session.lastCommands.slice(0, 5).forEach(cmd => {
            summary += `  ${cmd.result} ${cmd.command}\n`;
        });
    }

    return summary;
}

/**
 * UPDATE LAST ACTIVITY TIME
 */
function updateActivity(guildId, userId) {
    const session = getSession(guildId, userId);
    session.lastActivity = Date.now();
}

/**
 * CHECK IF SESSION EXPIRED
 * Sessions expire after 1 hour of inactivity
 */
function isSessionExpired(guildId, userId, maxIdleTime = 3600000) {
    const session = getSession(guildId, userId);
    return (Date.now() - session.lastActivity) > maxIdleTime;
}

/**
 * END SESSION
 * Clean up session data
 */
function endSession(guildId, userId) {
    const sessionKey = `${guildId}:${userId}`;
    return sessionContexts.delete(sessionKey);
}

/**
 * CLEANUP EXPIRED SESSIONS
 * Run periodically
 */
function cleanupExpiredSessions(maxIdleTime = 3600000) {
    let removed = 0;

    for (const [key, session] of sessionContexts.entries()) {
        if ((Date.now() - session.lastActivity) > maxIdleTime) {
            sessionContexts.delete(key);
            removed++;
        }
    }

    if (removed > 0) {
        console.log(`[SESSION] Cleaned up ${removed} expired sessions`);
    }

    return removed;
}

/**
 * GET SESSION STATS
 * For debugging
 */
function getSessionStats() {
    return {
        totalSessions: sessionContexts.size,
        sessions: Array.from(sessionContexts.values()).map(s => ({
            guildId: s.guildId,
            userId: s.userId,
            uptime: Math.floor((Date.now() - s.sessionStart) / 1000),
            commands: s.lastCommands.length,
            topic: s.currentTopic
        }))
    };
}

// Cleanup every 30 minutes
setInterval(() => cleanupExpiredSessions(), 1800000);

module.exports = {
    initSession,
    getSession,
    addCommand,
    setTopic,
    getContextString,
    getSessionSummary,
    updateActivity,
    isSessionExpired,
    endSession,
    cleanupExpiredSessions,
    getSessionStats
};
