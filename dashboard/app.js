const express = require('express');
const app = express();
const path = require('path');
const { ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { Conversation, Activity, ModLog } = require('../models/GuildMemory'); // Analytics Model
const db = require('../utils/mongodb-helper');
const os = require('os');
const moment = require('moment');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const MemoryStore = require('memorystore')(session);
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('moment-duration-format');

// Authentication modules
const DiscordOAuth2 = require('./oauth2-handler');
const { ensureAuthenticated, checkGuildAdmin } = require('./middleware/authCheck');

// API Routes
const voiceChannelsRoutes = require('./routes/voiceChannels');
const moderationRoutes = require('./routes/moderation');
const commandsRoutes = require('./routes/commands');
const profilesRoutes = require('./routes/profiles');

module.exports = (client) => {
    const port = process.env.PORT || 3000;
    
    // 🔐 OAuth2 Configuration - REQUIRED ENVIRONMENT VARIABLES
    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const DASHBOARD_URL = process.env.DASHBOARD_URL || `http://localhost:${port}`;
    const SESSION_SECRET = process.env.SESSION_SECRET;
    
    // Validate required credentials
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        throw new Error('[DASHBOARD] ❌ CRITICAL: Missing OAuth2 credentials. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env file');
    }
    
    if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
        console.warn('[DASHBOARD] ⚠️  WARNING: SESSION_SECRET not set or too short (<32 chars). Using temporary value - CHANGE IN PRODUCTION');
    }
    
    const oauth2 = new DiscordOAuth2(
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        `${DASHBOARD_URL}/auth/callback`
    );

    // View Engine Setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Static Files (CSS/Images)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    
    // Debug middleware: log all incoming requests and cookies
    app.use((req, res, next) => {
        if (req.path.startsWith('/auth') || req.path === '/servers') {
            console.log(`[REQUEST] ${req.method} ${req.path}`);
            console.log(`[REQUEST] Cookies:`, req.headers.cookie);
            console.log(`[REQUEST] SessionID in header:`, req.headers['cookie']?.split('connect.sid=')[1]?.split(';')[0]);
        }
        next();
    });
    
    // 🔐 Session Store Configuration
    // Always use MongoDB based on MONGO_URI environment variable
    let sessionStore;
    const MONGO_URI = process.env.MONGO_URI;
    
    if (MONGO_URI) {
        try {
            sessionStore = new MongoStore({
                mongoUrl: MONGO_URI,
                touchAfter: 24 * 3600,
                dbName: 'luminex',
                collectionName: 'sessions'
            });
            
            // Debug events
            sessionStore.on('connected', () => {
                console.log('[DASHBOARD] ✅ MongoStore connected');
            });
            
            sessionStore.on('disconnected', () => {
                console.log('[DASHBOARD] ⚠️  MongoStore disconnected');
            });
            
            sessionStore.on('error', (err) => {
                console.error('[DASHBOARD] ❌ MongoStore error:', err.message);
            });
            
            console.log('[DASHBOARD] ✅ Session store: MongoDB (MongoStore)');
        } catch (err) {
            console.error('[DASHBOARD] ❌ MongoDB session store error:', err.message);
            sessionStore = new MemoryStore({
                checkPeriod: 86400000
            });
            console.log('[DASHBOARD] ⚠️  Fallback session store: Memory');
        }
    } else {
        sessionStore = new MemoryStore({
            checkPeriod: 86400000 // prune expired entries every 24h
        });
        console.log('[DASHBOARD] ⚠️  Session store: Memory (MONGO_URI not set)');
    }

    // 🔐 Session Middleware with Persistent Store
    app.use(session({
        store: sessionStore,
        secret: SESSION_SECRET || 'temporary-secret-change-immediately',
        resave: false,
        saveUninitialized: true,
        cookie: { 
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
    }));
    
    // Debug session after it's loaded
    app.use((req, res, next) => {
        if (req.path.startsWith('/auth') || req.path === '/servers') {
            console.log(`[SESSION] SessionID: ${req.sessionID}`);
            console.log(`[SESSION] Session keys:`, Object.keys(req.session || {}));
            console.log(`[SESSION] userId present:`, !!req.session?.userId);
        }
        next();
    });

    // � RATE LIMITING MIDDLEWARE
    // OAuth token endpoint limiter (10 requests per minute per IP)
    const oauthLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: 'Çok fazla oturum açma denemesi, lütfen 1 dakika sonra tekrar deneyin',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => process.env.NODE_ENV !== 'production' // Disable in development
    });

    // Settings update limiter (30 requests per minute per guild)
    const settingsLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30,
        keyGenerator: (req) => req.params.id || req.ip, // Limit per guild
        message: 'Çok fazla ayar güncellemesi, lütfen biraz sonra tekrar deneyin',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => process.env.NODE_ENV !== 'production'
    });

    // General API limiter (100 requests per 15 minutes per IP)
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: 'Çok fazla istek, lütfen daha sonra tekrar deneyin',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => process.env.NODE_ENV !== 'production'
    });

    // Apply general API limiter to all routes
    app.use('/api/', apiLimiter);

    // �🔐 AUTHENTICATION ROUTES
    // Login page
    app.get('/auth/login', (req, res) => {
        res.render('login', { loginUrl: oauth2.getLoginUrl() });
    });

    // Discord OAuth callback
    app.get('/auth/discord', (req, res) => {
        res.redirect(oauth2.getLoginUrl());
    });

    // OAuth2 callback handler with rate limiting
    app.get('/auth/callback', oauthLimiter, async (req, res) => {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).render('error', {
                status: 400,
                message: 'OAuth2 kodu bulunamadı',
                actionUrl: '/auth/login',
                actionText: 'Tekrar Dene'
            });
        }

        try {
            // Exchange code for access token
            const tokenData = await oauth2.getAccessToken(code);
            
            // Get user info
            const user = await oauth2.getUserInfo(tokenData.access_token);
            
            // Calculate token expiry time
            const tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
            
            // Store in session with token metadata
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null;
            req.session.accessToken = tokenData.access_token;
            req.session.refreshToken = tokenData.refresh_token;
            req.session.tokenExpiresAt = tokenExpiresAt;
            req.session.tokenExpiresIn = tokenData.expires_in;
            req.session.loginTime = Date.now();
            
            console.log(`[AUTH] ✅ User logged in: ${user.username} (${user.id}) - Token expires in ${Math.floor(tokenData.expires_in / 36400)} days`);
            console.log(`[AUTH] 📝 Before save - Session ID: ${req.sessionID}`);
            console.log(`[AUTH] 📝 Session data:`, {
                userId: req.session.userId,
                username: req.session.username,
                tokenExpiresAt: new Date(tokenExpiresAt).toISOString()
            });
            
            // Save session before redirecting
            req.session.save((err) => {
                if (err) {
                    console.error('[AUTH] ❌ Session save error:', err);
                    console.error('[AUTH] Session data at save:', req.session);
                    return res.status(500).render('error', {
                        status: 500,
                        message: 'Oturum kaydı sırasında bir hata oluştu',
                        actionUrl: '/auth/login',
                        actionText: 'Tekrar Dene'
                    });
                }
                // Redirect to servers list after session is saved
                console.log(`[AUTH] ✅ Session saved - Session ID after save: ${req.sessionID}`);
                console.log('[AUTH] ✅ Cookie header:', res.getHeader('set-cookie'));
                res.redirect('/servers');
            });
        } catch (error) {
            console.error('[AUTH] OAuth2 error:', error.message);
            
            // Determine appropriate HTTP status code
            let statusCode = error.status || 500;
            let errorMessage = error.message || 'Oturum açma sırasında bilinmeyen bir hata oluştu';
            
            // Rate limit error should be 429
            if (error.message.includes('sınırlandırıldınız')) {
                statusCode = 429;
            }
            
            res.status(statusCode).render('error', {
                status: statusCode,
                message: errorMessage,
                actionUrl: '/auth/login',
                actionText: 'Tekrar Dene'
            });
        }
    });

    // Logout
    app.get('/auth/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) console.error('[AUTH] Logout error:', err);
            res.redirect('/auth/login');
        });
    });

    // 🔄 Token Refresh Endpoint (check if token is expiring soon and refresh)
    app.get('/auth/refresh-token', ensureAuthenticated, async (req, res) => {
        try {
            // Check if token exists and get remaining time
            if (!req.session.accessToken || !req.session.refreshToken) {
                console.warn('[AUTH] No tokens in session');
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token bulunamadı. Lütfen tekrar oturum açın.',
                    needsRelogin: true
                });
            }

            const now = Date.now();
            const tokenExpiresAt = req.session.tokenExpiresAt || now;
            const timeUntilExpiry = tokenExpiresAt - now;
            
            // If token expires within 1 hour, refresh it
            if (timeUntilExpiry < 60 * 60 * 1000) {
                console.log(`[AUTH] Token expiring soon (${Math.floor(timeUntilExpiry / 60000)}min), refreshing...`);
                
                try {
                    const newTokenData = await oauth2.refreshAccessToken(req.session.refreshToken);
                    
                    // Update session with new tokens
                    const newTokenExpiresAt = Date.now() + (newTokenData.expires_in * 1000);
                    req.session.accessToken = newTokenData.access_token;
                    req.session.tokenExpiresAt = newTokenExpiresAt;
                    req.session.tokenExpiresIn = newTokenData.expires_in;
                    
                    // Refresh token might change too
                    if (newTokenData.refresh_token) {
                        req.session.refreshToken = newTokenData.refresh_token;
                    }
                    
                    req.session.save((err) => {
                        if (err) {
                            console.error('[AUTH] Token refresh save error:', err);
                            return res.status(500).json({ 
                                success: false, 
                                error: 'Token kaydı sırasında hata oluştu'
                            });
                        }
                        res.json({ 
                            success: true, 
                            message: 'Token başarıyla yenilendi',
                            expiresIn: newTokenData.expires_in
                        });
                    });
                    return;
                } catch (refreshError) {
                    console.error('[AUTH] Token refresh failed:', refreshError.message);
                    return res.status(401).json({ 
                        success: false, 
                        error: 'Token yenilenemedi. Lütfen tekrar oturum açın.',
                        needsRelogin: true
                    });
                }
            } else {
                // Token still valid
                res.json({ 
                    success: true, 
                    message: 'Token geçerli',
                    expiresIn: Math.floor(timeUntilExpiry / 1000),
                    refreshNeeded: false
                });
            }
        } catch (error) {
            console.error('[AUTH] Refresh token error:', error.message);
            res.status(500).json({ 
                success: false, 
                error: 'Token yenileme sırasında hata oluştu'
            });
        }
    });

    // 🌟 Public Landing Page
    app.get('/', (req, res) => {
        res.render('landing', {
            bot: client.user,
            isAuthenticated: !!(req.session && req.session.userId),
            user: req.session ? {
                username: req.session.username,
                avatar: req.session.avatar
            } : null
        });
    });

    // 🌟 Ana Sayfa (Dashboard Home - Authenticated)
    // Kullanıcı akışı artık sadece `/servers` + `/server/:id` üzerinden ilerliyor.
    app.get('/dashboard', ensureAuthenticated, (req, res) => {
        res.redirect('/servers');
    });

    // 🌟 Sunucu Yönetim Sayfası
    app.get('/servers', ensureAuthenticated, async (req, res) => {
        try {
            // Check if bot is ready
            if (!client.isReady()) {
                console.warn('[DASHBOARD] ⚠️ Bot is not ready yet for /servers');
                return res.status(503).render('error', {
                    status: 503,
                    message: 'Bot hazırlanıyor, lütfen biraz sonra tekrar deneyin',
                    actionUrl: '/',
                    actionText: 'Geri Dön'
                });
            }

            // Get user's guilds where they are admin
            const config = require('../config.json');
            const userGuilds = [];
            
            for (const [guildId, guild] of client.guilds.cache) {
                try {
                    // Fetch members to ensure cache is populated
                    await guild.members.fetch({ user: req.session.userId });
                    const member = guild.members.cache.get(req.session.userId);
                    
                    if (!member) continue;
                    
                    const isAdmin = member.permissions.has('Administrator');
                    const isOwner = req.session.userId === config.ownerID;
                    
                    if (isAdmin || isOwner) {
                        userGuilds.push({
                            id: guild.id,
                            name: guild.name,
                            icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
                            memberCount: guild.memberCount,
                            isAdmin: isAdmin,
                            isOwner: isOwner
                        });
                    }
                } catch (err) {
                    console.warn(`[DASHBOARD] Error processing guild ${guildId}:`, err.message);
                    continue;
                }
            }

            res.render('servers', {
                bot: client.user,
                guilds: userGuilds,
                user: {
                    username: req.session.username,
                    avatar: req.session.avatar
                }
            });
        } catch (error) {
            console.error('[DASHBOARD] /servers error:', error);
            res.status(500).render('error', {
                status: 500,
                message: 'Sunucuların yüklenmesi sırasında hata oluştu',
                actionUrl: '/',
                actionText: 'Ana Sayfa'
            });
        }
    });

    // 🌟 Özel Sunucu İstatistikleri ve Ayarları
    app.get('/server/:id', ensureAuthenticated, checkGuildAdmin(client), async (req, res) => {
        try {
            const guild = req.guild;
            if (!guild) return res.redirect('/servers');
            
            // Fetch all members to populate cache (required for member operations)
            // Use pagination for large servers to avoid timeout
            const memberFetchPromise = guild.members.fetch({ limit: null, withPresences: false });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Member fetch timeout')), 10000)
            );
            
            Promise.race([memberFetchPromise, timeoutPromise])
                .then(() => console.log(`[DASHBOARD] Members fetched for guild ${guild.id} (${guild.memberCount} members)`))
                .catch(err => console.warn(`[DASHBOARD] Member fetch issue for ${guild.id}: ${err.message} - continuing with cached members`));

            // Parallel database fetch calls for better performance
            const [kufurEngel, reklamEngel, otorolId, hosgeldinKanalId, logKanalId, aiMod, proactiveMod, levelMod, logMod] = await Promise.all([
                db.fetch(`kufurengel_${guild.id}`).then(v => !!v),
                db.fetch(`reklamengel_${guild.id}`).then(v => !!v),
                db.fetch(`otorol_${guild.id}`),
                db.fetch(`hosgeldinkanal_${guild.id}`),
                db.fetch(`log_channel_${guild.id}`),
                db.fetch(`aimod_${guild.id}`).then(v => v !== false),
                db.fetch(`proaktif_mod_${guild.id}`).then(v => v === true),
                db.fetch(`module_${guild.id}_seviye-sistemi`).then(v => v !== false),
                db.fetch(`module_${guild.id}_log-sistemi`).then(v => v === true)
            ]);

            // Sunucu Rolleri ve Kanalları (from cache)
            const roles = guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name }));
            const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name }));

            // Seviye İstatistikleri (Liderlik Tablosu) - fetch in background
            let leaderboard = [];
            try {
                const levelSystem = require('../utils/level-system');
                leaderboard = await Promise.race([
                    levelSystem.getLeaderboard(guild.id, 5),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Leaderboard timeout')), 5000))
                ]);
            } catch (err) {
                console.warn(`[DASHBOARD] Leaderboard fetch timeout for ${guild.id}`);
            }

            // Veritabanından Analitik Veri (MongoDB Activity & ModLog) - fetch in parallel
            let topChannels = [];
            let modLogs = [];
            if (mongoose.connection.readyState === 1) {
                const [activities, logs] = await Promise.allSettled([
                    Activity.find({ guildId: guild.id }).sort({ count: -1 }).limit(5).exec(),
                    ModLog.find({ guildId: guild.id }).sort({ timestamp: -1 }).limit(10).exec()
                ]);
                
                if (activities.status === 'fulfilled') {
                    topChannels = activities.value.map(a => ({ name: a.channelName || 'Bilinmiyor', count: a.count }));
                }
                if (logs.status === 'fulfilled') {
                    modLogs = logs.value;
                }
            }

            res.render('server-detail', {
                bot: client.user,
                guild,
                settings: { kufurEngel, reklamEngel, otorolId, hosgeldinKanalId, logKanalId, aiMod, levelMod, logMod, proactiveMod },
                roles,
                textChannels,
                topChannels,
                leaderboard,
                modLogs,
                user: {
                    username: req.session.username,
                    avatar: req.session.avatar
                }
            });
        } catch (error) {
            console.error('[DASHBOARD] Server detail error:', error);
            res.status(500).render('error', {
                status: 500,
                message: 'Sunucu detayları yüklenirken hata oluştu',
                actionUrl: '/servers',
                actionText: 'Sunuculara Dön'
            });
        }
    });

    // 🌟 Form Post İşlemleri (Ayarları Değiştir) with Rate Limiting
    app.post('/server/:id/update', 
        ensureAuthenticated,
        checkGuildAdmin(client),
        settingsLimiter,
        [
            // Validation rules for form inputs
            body('kufurEngel').optional().trim().escape(),
            body('reklamEngel').optional().trim().escape(),
            body('aiMod').optional().trim().escape(),
            body('proactiveMod').optional().trim().escape(),
            body('levelMod').optional().trim().escape(),
            body('logMod').optional().trim().escape(),
            // Discord snowflake (17-20 digit) + reset için `none`
            body('otorol').optional().trim().custom((value) => {
                if (value === 'none') return true;
                if (!/^\d{17,20}$/.test(value)) throw new Error('Geçersiz rol ID');
                return true;
            }),
            body('welcomeChannel').optional().trim().custom((value) => {
                if (value === 'none') return true;
                if (!/^\d{17,20}$/.test(value)) throw new Error('Geçersiz kanal ID');
                return true;
            }),
            body('logChannel').optional().trim().custom((value) => {
                if (value === 'none') return true;
                if (!/^\d{17,20}$/.test(value)) throw new Error('Geçersiz kanal ID');
                return true;
            })
        ],
        async (req, res) => {
            try {
                // Check for validation errors
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ success: false, errors: errors.array() });
                }

                const guildId = req.params.id;
                const guild = req.guild;
                if (!guild) return res.status(404).json({ success: false, message: 'Guild not found' });

                const assertDb = async (operation, action) => {
                    try {
                        const result = await operation;
                        if (result === false) {
                            console.warn(`[DASHBOARD] ⚠️ Database operation may have failed: ${action} (returned false)`);
                        }
                        return result;
                    } catch (error) {
                        console.error(`[DASHBOARD] ❌ Database error for ${action}:`, error.message);
                        // Don't throw - allow operation to continue with logged warning
                        return null;
                    }
                };

                // Kufur Engel Güncelleme
                if (req.body.kufurEngel === 'on') {
                    await assertDb(db.set(`kufurengel_${guildId}`, true), 'kufurengel');
                } else {
                    await assertDb(db.delete(`kufurengel_${guildId}`), 'kufurengel');
                }

                // Reklam Engel Güncelleme
                if (req.body.reklamEngel === 'on') {
                    await assertDb(db.set(`reklamengel_${guildId}`, true), 'reklamengel');
                } else {
                    await assertDb(db.delete(`reklamengel_${guildId}`), 'reklamengel');
                }

                // AI Mod Güncelleme
                if (req.body.aiMod === 'on') {
                    await assertDb(db.set(`aimod_${guildId}`, true), 'aimod');
                } else {
                    await assertDb(db.set(`aimod_${guildId}`, false), 'aimod');
                }

                // Proaktif Mod Güncelleme
                if (req.body.proactiveMod === 'on') {
                    await assertDb(db.set(`proaktif_mod_${guildId}`, true), 'proaktif_mod');
                } else {
                    await assertDb(db.set(`proaktif_mod_${guildId}`, false), 'proaktif_mod');
                }

                // Seviye Sistemi Güncelleme
                if (req.body.levelMod === 'on') {
                    await assertDb(db.set(`module_${guildId}_seviye-sistemi`, true), 'level module');
                } else {
                    await assertDb(db.set(`module_${guildId}_seviye-sistemi`, false), 'level module');
                }

                // Log Sistemi Güncelleme
                if (req.body.logMod === 'on') {
                    await assertDb(db.set(`module_${guildId}_log-sistemi`, true), 'log module');
                } else {
                    await assertDb(db.set(`module_${guildId}_log-sistemi`, false), 'log module');
                }

                // Otorol Güncelleme
                if (req.body.otorol && req.body.otorol !== 'none') {
                    await assertDb(db.set(`otorol_${guildId}`, req.body.otorol), 'otorol');
                } else {
                    await assertDb(db.delete(`otorol_${guildId}`), 'otorol');
                }

                // Hoşgeldin Kanalı Güncelleme
                if (req.body.welcomeChannel && req.body.welcomeChannel !== 'none') {
                    assertDb(await db.set(`hosgeldinkanal_${guildId}`, req.body.welcomeChannel), 'hosgeldinkanal');
                    assertDb(await db.set(`module_${guildId}_hosgeldin-sistemi`, true), 'hosgeldin module'); // Modülü de aktif et
                } else {
                    assertDb(await db.delete(`hosgeldinkanal_${guildId}`), 'hosgeldinkanal');
                    assertDb(await db.delete(`module_${guildId}_hosgeldin-sistemi`), 'hosgeldin module');
                }

                // Log Kanalı Güncelleme
                if (req.body.logChannel && req.body.logChannel !== 'none') {
                    assertDb(await db.set(`log_channel_${guildId}`, req.body.logChannel), 'log_channel');
                } else {
                    assertDb(await db.delete(`log_channel_${guildId}`), 'log_channel');
                }

                // Başarılı döngü
                console.log(`[DASHBOARD] ✅ Guild settings updated for ${guildId} by ${req.session.username}`);
                res.redirect(`/server/${guildId}?success=true`);
            } catch (error) {
                console.error('[DASHBOARD] Settings update error:', error);
                res.status(500).render('error', {
                    status: 500,
                    message: 'Ayarlar kaydedilirken bir hata olustu: ' + error.message,
                    actionUrl: `/server/${req.params.id}`,
                    actionText: 'Geri Dön'
                });
            }
        }
    );

    // 🔌 API ROUTES - Voice Channels Management
    const voiceChannels = voiceChannelsRoutes(client, ensureAuthenticated, checkGuildAdmin);
    
    app.get('/api/server/:id/voice-channels', ...voiceChannels.getVoiceChannels);
    app.post('/api/server/:id/voice-channels', ...voiceChannels.createVoiceChannel);
    app.patch('/api/server/:id/voice-channels/:channelId', ...voiceChannels.updateVoiceChannel);
    app.delete('/api/server/:id/voice-channels/:channelId', ...voiceChannels.deleteVoiceChannel);

    // 🔌 API ROUTES - Moderation Management
    const moderation = moderationRoutes(client, ensureAuthenticated, checkGuildAdmin);
    
    app.post('/api/server/:id/mod/ban', ...moderation.banUser);
    app.post('/api/server/:id/mod/kick', ...moderation.kickUser);
    app.post('/api/server/:id/mod/warn', ...moderation.warnUser);
    app.get('/api/server/:id/mod/warnings/:userId', ...moderation.getUserWarnings);
    app.post('/api/server/:id/mod/clear', ...moderation.clearMessages);
    app.get('/api/server/:id/mod/logs', ...moderation.getModerationLogs);

    // 🔌 API ROUTES - Bot Commands CRUD
    const commands = commandsRoutes(client, ensureAuthenticated, checkGuildAdmin);
    
    app.get('/api/server/:id/commands', ...commands.getCommands);
    app.post('/api/server/:id/commands', ...commands.createCommand);
    app.get('/api/server/:id/commands/:commandId', ...commands.getCommand);
    app.patch('/api/server/:id/commands/:commandId', ...commands.updateCommand);
    app.delete('/api/server/:id/commands/:commandId', ...commands.deleteCommand);

    // 🔌 API ROUTES - User Profiles & Leaderboard
    const profiles = profilesRoutes(client, ensureAuthenticated, checkGuildAdmin);
    
    app.get('/api/server/:id/user/:userId/profile', ...profiles.getUserProfile);
    app.get('/api/server/:id/leaderboard', ...profiles.getLeaderboard);
    app.get('/api/server/:id/user/:userId/activity', ...profiles.getUserActivity);
    app.get('/api/server/:id/stats', ...profiles.getServerStats);

    // 🌐  404 HANDLER
    app.use((req, res) => {
        res.status(404).render('error', {
            status: 404,
            message: 'Sayfa bulunamadı',
            actionUrl: '/',
            actionText: 'Ana Sayfa'
        });
    });

    // 🔥 ERROR HANDLER
    app.use((err, req, res, next) => {
        console.error('[DASHBOARD ERROR]', err);
        res.status(err.status || 500).render('error', {
            status: err.status || 500,
            message: err.message || 'Bir hata oluştu',
            actionUrl: '/',
            actionText: 'Ana Sayfa'
        });
    });

    app.listen(port, () => {
        console.log(`[DASHBOARD] 🌐 Web paneli http://localhost:${port} adresinde aktif.`);
        console.log(`[DASHBOARD] 📍 Erişim: http://localhost:${port}/`);
        console.log(`[DASHBOARD] 🔐 Oturum: http://localhost:${port}/auth/login`);
    });
};
