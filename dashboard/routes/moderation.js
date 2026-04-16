/**
 * Moderation Management API Routes
 * Handles ban, kick, warn, and moderation logs
 */

const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// MongoDB Moderation Schema
const ModerationLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: String,
    action: { type: String, enum: ['ban', 'kick', 'warn', 'clear'] },
    reason: String,
    moderatorId: String,
    createdAt: { type: Date, default: Date.now }
});

// Get or create model
let ModerationLog;
try {
    ModerationLog = mongoose.model('ModerationLog');
} catch {
    ModerationLog = mongoose.model('ModerationLog', ModerationLogSchema);
}

module.exports = (client, ensureAuthenticated, checkGuildAdmin) => {
    return {
        // POST /api/server/:id/mod/ban - Ban user
        banUser: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('userId').notEmpty().withMessage('Kullanıcı ID gerekli'),
                body('reason').optional().trim().isLength({ max: 512 })
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { userId, reason } = req.body;
                    const guild = req.guild;

                    // Ban the user
                    await guild.members.ban(userId, { reason: reason || 'Specifi belirtilmedi' });

                    // Log the action
                    const log = new ModerationLog({
                        guildId: guild.id,
                        userId: userId,
                        action: 'ban',
                        reason: reason,
                        moderatorId: req.session.userId
                    });
                    await log.save();

                    console.log(`[MOD] User ${userId} banned from ${guild.name} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `Kullanıcı başarıyla yasaklandı`
                    });
                } catch (error) {
                    console.error('[MOD] Ban error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Kullanıcı yasaklanırken hata: ' + error.message
                    });
                }
            }
        ],

        // POST /api/server/:id/mod/kick - Kick user
        kickUser: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('userId').notEmpty().withMessage('Kullanıcı ID gerekli'),
                body('reason').optional().trim().isLength({ max: 512 })
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { userId, reason } = req.body;
                    const guild = req.guild;

                    // Kick the user
                    const member = await guild.members.fetch(userId);
                    await member.kick(reason || 'Sebep belirtilmedi');

                    // Log the action
                    const log = new ModerationLog({
                        guildId: guild.id,
                        userId: userId,
                        action: 'kick',
                        reason: reason,
                        moderatorId: req.session.userId
                    });
                    await log.save();

                    console.log(`[MOD] User ${userId} kicked from ${guild.name} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `Kullanıcı başarıyla sunucudan çıkarıldı`
                    });
                } catch (error) {
                    console.error('[MOD] Kick error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Kullanıcı çıkarılırken hata: ' + error.message
                    });
                }
            }
        ],

        // POST /api/server/:id/mod/warn - Add warning
        warnUser: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('userId').notEmpty().withMessage('Kullanıcı ID gerekli'),
                body('reason').optional().trim().isLength({ max: 512 })
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { userId, reason } = req.body;
                    const guild = req.guild;

                    // Log the warning
                    const log = new ModerationLog({
                        guildId: guild.id,
                        userId: userId,
                        action: 'warn',
                        reason: reason,
                        moderatorId: req.session.userId
                    });
                    await log.save();

                    console.log(`[MOD] User ${userId} warned in ${guild.name} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `Kullanıcıya uyarı verildi`
                    });
                } catch (error) {
                    console.error('[MOD] Warn error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Uyarı vgrilirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/mod/warnings/:userId - Get user warnings
        getUserWarnings: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { userId } = req.params;
                    const guild = req.guild;

                    // Get all warnings for user
                    const warnings = await ModerationLog.find({
                        guildId: guild.id,
                        userId: userId,
                        action: 'warn'
                    }).sort({ createdAt: -1 });

                    res.json({
                        success: true,
                        data: warnings,
                        count: warnings.length
                    });
                } catch (error) {
                    console.error('[MOD] Get warnings error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Uyarılar getirilirken hata: ' + error.message
                    });
                }
            }
        ],

        // POST /api/server/:id/mod/clear - Clear messages
        clearMessages: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('count').isInt({ min: 1, max: 100 }).withMessage('Sayı 1-100 arasında olmalı'),
                body('channelId').notEmpty().withMessage('Kanal ID gerekli')
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { count, channelId, userId } = req.body;
                    const guild = req.guild;
                    const channel = guild.channels.cache.get(channelId);

                    if (!channel) {
                        return res.status(404).json({
                            success: false,
                            error: 'Kanal bulunamadı'
                        });
                    }

                    // Clear messages
                    const fetched = await channel.messages.fetch({ limit: count });
                    
                    let deleted = 0;
                    for (const msg of fetched.values()) {
                        // Skip if userId filter is specified and message is not from that user
                        if (userId && msg.author.id !== userId) continue;
                        
                        await msg.delete().catch(() => { });
                        deleted++;
                    }

                    // Log the action
                    const log = new ModerationLog({
                        guildId: guild.id,
                        userId: userId,
                        action: 'clear',
                        reason: `${deleted} mesaj silindi #${channel.name} kanalından`,
                        moderatorId: req.session.userId
                    });
                    await log.save();

                    console.log(`[MOD] ${deleted} messages cleared from #${channel.name} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `${deleted} mesaj silindi`
                    });
                } catch (error) {
                    console.error('[MOD] Clear error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Mesajlar silinirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/mod/logs - Get moderation logs
        getModerationLogs: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const guild = req.guild;
                    const { limit = 50, offset = 0 } = req.query;

                    const logs = await ModerationLog.find({
                        guildId: guild.id
                    })
                        .sort({ createdAt: -1 })
                        .limit(parseInt(limit))
                        .skip(parseInt(offset));

                    const total = await ModerationLog.countDocuments({ guildId: guild.id });

                    res.json({
                        success: true,
                        data: logs,
                        count: logs.length,
                        total: total
                    });
                } catch (error) {
                    console.error('[MOD] Get logs error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Loglar getirilirken hata: ' + error.message
                    });
                }
            }
        ]
    };
};
