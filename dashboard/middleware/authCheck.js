/**
 * Dashboard Authentication Middleware
 * Ensures user is authenticated and is admin of the guild they're accessing
 */

const config = require("../../config.json");

/**
 * Middleware to check if user is authenticated
 */
const ensureAuthenticated = (req, res, next) => {
    console.log('[AUTH-CHECK] Request to protected route:', req.path);
    console.log(`[AUTH-CHECK] 📍 Session ID from request: ${req.sessionID}`);
    console.log('[AUTH-CHECK] 📍 Cookies received:', req.cookies);
    console.log('[AUTH-CHECK] Session data:', {
        hasSession: !!req.session,
        hasUserId: !!req.session?.userId,
        userId: req.session?.userId,
        sessionID: req.sessionID
    });
    
    if (!req.session || !req.session.userId) {
        console.log('[AUTH-CHECK] ❌ No session or userId found');
        return res.status(401).render('error', {
            status: 401,
            message: 'Oturum açmanız gerekmektedir',
            actionUrl: '/auth/login',
            actionText: 'Discord ile Oturum Aç'
        });
    }

    // Check if token is expired
    const now = Date.now();
    const tokenExpiresAt = req.session.tokenExpiresAt || now;
    
    if (now > tokenExpiresAt) {
        console.log(`[AUTH-CHECK] ❌ Token expired for user ${req.session.userId}`);
        req.session.destroy((err) => {
            if (err) console.error('[AUTH] Logout error:', err);
        });
        
        return res.status(401).render('error', {
            status: 401,
            message: 'Oturumunuzun süresi dolmuş. Lütfen tekrar oturum açın.',
            actionUrl: '/auth/login',
            actionText: 'Discord ile Oturum Aç'
        });
    }

    console.log('[AUTH-CHECK] ✅ Authentication passed for user:', req.session.userId);
    next();
};

/**
 * Middleware to check if user is admin of a specific guild
 * @param {DiscordClient} client - Discord client instance
 * @returns {Function} Middleware function
 */
const checkGuildAdmin = (client) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Authenticated required' });
        }

        // Check if bot is ready
        if (!client.isReady()) {
            console.warn('[DASHBOARD] ⚠️ Bot is not ready yet. Returning 503 Service Unavailable');
            return res.status(503).render('error', {
                status: 503,
                message: 'Bot hazırlanıyor, lütfen biraz sonra tekrar deneyin',
                actionUrl: '/servers',
                actionText: 'Tekrar Dene'
            });
        }

        const guildId = req.params.id;
        const userId = req.session.userId;

        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).render('error', {
                    status: 404,
                    message: 'Sunucu bulunamadı',
                    actionUrl: '/servers',
                    actionText: 'Sunucuları Görüntüle'
                });
            }

            // Fetch the member
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
                return res.status(403).render('error', {
                    status: 403,
                    message: 'Bu sunucunun üyesi değilsiniz',
                    actionUrl: '/servers',
                    actionText: 'Sunucuları Görüntüle'
                });
            }

            // Check if user has administrator permission
            const hasAdmin = member.permissions.has('Administrator') || userId === config.ownerID;
            if (!hasAdmin) {
                return res.status(403).render('error', {
                    status: 403,
                    message: 'Bu sunucuyu yönetmek için yönetici izniniz olması gerekmektedir',
                    actionUrl: '/servers',
                    actionText: 'Sunucuları Görüntüle'
                });
            }

            // Store guild and member info for later use
            req.guild = guild;
            req.member = member;
            next();
        } catch (error) {
            console.error('[AUTH] Sunucu kontrol hatası:', error.message);
            return res.status(500).render('error', {
                status: 500,
                message: 'Sunucu kontrolü sırasında bir hata oluştu: ' + error.message,
                actionUrl: '/servers',
                actionText: 'Geri Dön'
            });
        }
    };
};

/**
 * Middleware to check if user is bot owner (for admin panel)
 */
const checkBotOwner = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.session.userId !== config.ownerID) {
        return res.status(403).json({ error: 'Only bot owner can access this' });
    }

    next();
};

/**
 * CSRF Token validation middleware
 */
const validateCSRFToken = (req, res, next) => {
    // This will be handled by csurf package
    next();
};

module.exports = {
    ensureAuthenticated,
    checkGuildAdmin,
    checkBotOwner,
    validateCSRFToken
};
