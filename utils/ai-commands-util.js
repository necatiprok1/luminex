const { PermissionsBitField } = require('discord.js');

const DEVELOPERS = ['necati9880', 'luminexcode', 'epicwolflider'];

function hasPermission(message, requiredLevel = 'admin') {
    const member = message.member;
    if (!member) return false; // No member = no permission
    
    const isOwner = message.author.id === message.guild.ownerId;
    const isDev = DEVELOPERS.includes(message.author.username);
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (requiredLevel === 'owner') return isOwner || isDev;
    if (requiredLevel === 'dev') return isDev;
    if (requiredLevel === 'admin') return isOwner || isDev || isAdmin;
    return true;
}

async function findUser(guild, query) {
    if (!query) return null;
    
    // Strip @ prefix if present (convert @username to username)
    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
    
    const mentionMatch = cleanQuery.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        try { return await guild.members.fetch(mentionMatch[1]); } catch { return null; }
    }
    if (/^\d+$/.test(cleanQuery)) {
        try { return await guild.members.fetch(cleanQuery); } catch { return null; }
    }
    // Optimized Search - now cleanQuery has @ stripped
    try {
        const results = await guild.members.fetch({ query: cleanQuery, limit: 1 });
        if (results.size > 0) return results.first();
    } catch (err) { console.error("Member fetch error:", err); }

    return null;
}

async function findRole(guild, query) {
    if (!query) return null;

    // 1. ID Match (<@&123> or 123)
    const mentionMatch = query.match(/^<@&(\d+)>$/);
    if (mentionMatch) return await guild.roles.fetch(mentionMatch[1]).catch(() => null);
    if (/^\d+$/.test(query)) return await guild.roles.fetch(query).catch(() => null);

    // 2. Fetch all for name search
    await guild.roles.fetch();

    // 3. Name Search (Clean @ if present)
    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
    if (!cleanQuery) return null; // Avoid matching everything with empty string

    return guild.roles.cache.find(r =>
        r.name.toLowerCase() === query.toLowerCase() ||
        r.name.toLowerCase() === cleanQuery.toLowerCase() ||
        r.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        r.id === query
    );
}

async function findChannel(guild, query) {
    if (!query) return null;
    
    // # prefix temizle
    const cleanQuery = query.startsWith('#') ? query.slice(1) : query;
    
    const mentionMatch = cleanQuery.match(/^<#(\d+)>$/);

    // ID Check
    if (mentionMatch) return await guild.channels.fetch(mentionMatch[1]).catch(() => null);
    if (/^\d+$/.test(cleanQuery)) return await guild.channels.fetch(cleanQuery).catch(() => null);

    // Name Search
    await guild.channels.fetch();
    return guild.channels.cache.find(c => 
        c.name.toLowerCase() === cleanQuery.toLowerCase() || 
        c.name.toLowerCase() === query.toLowerCase() ||
        c.id === cleanQuery
    );
}

module.exports = { hasPermission, findUser, findRole, findChannel, DEVELOPERS };
