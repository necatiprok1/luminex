/**
 * User Profiles & Statistics API Routes
 * Handles user profile data, leaderboards, and activity
 */

const { Conversation, Activity } = require('../models/GuildMemory');

module.exports = (client, ensureAuthenticated, checkGuildAdmin) => {
    return {
        // GET /api/server/:id/user/:userId/profile - Get user profile
        getUserProfile: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { userId } = req.params;
                    const guild = req.guild;

                    // Get member from guild
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) {
                        return res.status(404).json({
                            success: false,
                            error: 'Kullanıcı sunucuda bulunamadı'
                        });
                    }

                    // Get user's activity from MongoDB
                    const userActivity = await Activity.findOne({
                        guildId: guild.id,
                        userId: userId
                    });

                    // Get conversation count
                    const conversationCount = await Conversation.countDocuments({
                        guildId: guild.id,
                        userId: userId
                    });

                    const profile = {
                        userId: member.id,
                        username: member.user.username,
                        displayName: member.displayName,
                        avatar: member.user.displayAvatarURL(),
                        joinedAt: member.joinedAt,
                        roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
                        messageCount: userActivity?.count || 0,
                        conversationCount: conversationCount,
                        isBot: member.user.bot,
                        isPremium: member.premiumSinceTimestamp !== null
                    };

                    res.json({
                        success: true,
                        data: profile
                    });
                } catch (error) {
                    console.error('[PROFILE] Get profile error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Profil getirilirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/leaderboard - Get leaderboard
        getLeaderboard: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const guild = req.guild;
                    const { limit = 50, offset = 0 } = req.query;

                    // Get top users by message count
                    const leaderboard = await Activity.find({
                        guildId: guild.id
                    })
                        .sort({ count: -1 })
                        .limit(parseInt(limit))
                        .skip(parseInt(offset));

                    const total = await Activity.countDocuments({ guildId: guild.id });

                    // Enrich with member info
                    const enriched = [];
                    for (let i = 0; i < leaderboard.length; i++) {
                        const activity = leaderboard[i];
                        const member = await guild.members.fetch(activity.userId).catch(() => null);
                        
                        if (member) {
                            enriched.push({
                                rank: offset + i + 1,
                                userId: activity.userId,
                                username: member.user.username,
                                displayName: member.displayName,
                                avatar: member.user.displayAvatarURL(),
                                messageCount: activity.count,
                                channelName: activity.channelName
                            });
                        }
                    }

                    res.json({
                        success: true,
                        data: enriched,
                        count: enriched.length,
                        total: total
                    });
                } catch (error) {
                    console.error('[PROFILE] Get leaderboard error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Leaderboard getirilirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/user/:userId/activity - Get user activity timeline
        getUserActivity: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { userId } = req.params;
                    const guild = req.guild;
                    const { limit = 100, offset = 0 } = req.query;

                    // Get conversations
                    const conversations = await Conversation.find({
                        guildId: guild.id,
                        userId: userId
                    })
                        .sort({ timestamp: -1 })
                        .limit(parseInt(limit))
                        .skip(parseInt(offset));

                    const total = await Conversation.countDocuments({
                        guildId: guild.id,
                        userId: userId
                    });

                    // Format activity
                    const activity = conversations.map(conv => ({
                        id: conv._id,
                        type: 'conversation',
                        timestamp: conv.timestamp,
                        channelId: conv.channelId,
                        channelName: conv.channelName,
                        topic: conv.topic?.substring(0, 100), // First 100 chars
                        messageCount: conv.messages?.length || 0
                    }));

                    res.json({
                        success: true,
                        data: activity,
                        count: activity.length,
                        total: total
                    });
                } catch (error) {
                    console.error('[PROFILE] Get activity error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Aktivite getirilirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/stats - Get server-wide statistics
        getServerStats: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const guild = req.guild;

                    // Get stats
                    const uniqueUsers = await Activity.distinct('userId', { guildId: guild.id });
                    const totalMessages = await Activity.aggregate([
                        { $match: { guildId: guild.id } },
                        { $group: { _id: null, total: { $sum: '$count' } } }
                    ]);
                    
                    const totalConversations = await Conversation.countDocuments({ guildId: guild.id });
                    const channelStats = await Activity.find({ guildId: guild.id })
                        .sort({ count: -1 })
                        .limit(10);

                    const stats = {
                        serverName: guild.name,
                        membersCount: guild.memberCount,
                        uniqueActiveUsers: uniqueUsers.length,
                        totalMessages: totalMessages[0]?.total || 0,
                        totalConversations: totalConversations,
                        topChannels: channelStats.map(c => ({
                            name: c.channelName,
                            count: c.count
                        }))
                    };

                    res.json({
                        success: true,
                        data: stats
                    });
                } catch (error) {
                    console.error('[PROFILE] Get stats error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'İstatistikler getirilirken hata: ' + error.message
                    });
                }
            }
        ]
    };
};
