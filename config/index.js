/**
 * Centralized Configuration Management
 * Load all settings from environment variables with fallback defaults
 */

require('dotenv').config();

const config = {
    // 🤖 BOT CONFIGURATION
    bot: {
        token: process.env.DISCORD_TOKEN || '',
        ownerID: process.env.OWNER_ID || '',
        prefix: process.env.BOT_PREFIX || '!',
        status: process.env.BOT_STATUS || 'Luminex AI Bot',
    },

    // 🌐 DASHBOARD CONFIGURATION
    dashboard: {
        port: parseInt(process.env.PORT) || 3000,
        url: process.env.DASHBOARD_URL || 'http://localhost:3000',
        sessionSecret: process.env.SESSION_SECRET || 'luminex-dashboard-secret-key-change-in-production',
        environment: process.env.NODE_ENV || 'development',
        
        // OAuth2 Settings
        oauth2: {
            clientId: process.env.DISCORD_CLIENT_ID || '',
            clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
            redirectUri: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard/auth/callback`
        }
    },

    // 🧠 AI SERVICE CONFIGURATION
    ai: {
        // Ollama (Local LLM)
        ollama: {
            url: process.env.OLLAMA_URL || 'http://host.docker.internal:11434',
            model: process.env.OLLAMA_MODEL || 'neural-chat',
            temperature: parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7,
            timeouts: parseInt(process.env.OLLAMA_TIMEOUT) || 30000
        },

        // OpenRouter (Cloud-based)
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY || '',
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-2-70b-chat',
            apiUrl: 'https://openrouter.ai/api/v1'
        },

        // Google Gemini
        gemini: {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: process.env.GEMINI_MODEL || 'gemini-pro'
        },

        // Memory & Cache
        memory: {
            historyTTL: parseInt(process.env.HISTORY_TTL) || 24 * 60 * 60 * 1000, // 24 hours
            maxHistorySize: parseInt(process.env.MAX_HISTORY_SIZE) || 10000,
            cacheDuration: parseInt(process.env.CACHE_DURATION) || 5 * 60 * 1000 // 5 minutes
        }
    },

    // 🗄️ DATABASE CONFIGURATION
    database: {
        // MongoDB
        mongodb: {
            uri: process.env.MONGO_URI || 'mongodb://localhost:27017/luminex',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                retryWrites: true,
                w: 'majority'
            }
        },

        // Redis (Optional for caching)
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || '',
            db: parseInt(process.env.REDIS_DB) || 0
        }
    },

    // 📊 LOGGING & ANALYTICS
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        errorWebhook: process.env.ERROR_WEBHOOK_URL || '',
        analyticsEnabled: process.env.ANALYTICS_ENABLED !== 'false'
    },

    // 🔒 SECURITY
    security: {
        enableAPIRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.MAX_REQUESTS_PER_WINDOW) || 100,
        enableCSRF: process.env.ENABLE_CSRF !== 'false'
    },

    // 🎯 FEATURE FLAGS
    features: {
        aiEnabled: process.env.AI_ENABLED !== 'false',
        moderationEnabled: process.env.MODERATION_ENABLED !== 'false',
        levelSystemEnabled: process.env.LEVEL_SYSTEM_ENABLED !== 'false',
        giveawaySystemEnabled: process.env.GIVEAWAY_SYSTEM_ENABLED !== 'false',
        ticketSystemEnabled: process.env.TICKET_SYSTEM_ENABLED !== 'false',
        ragPipelineEnabled: process.env.RAG_PIPELINE_ENABLED !== 'false'
    },

    // 🚀 SHARDING & CLUSTERING
    clustering: {
        enabled: process.env.SHARDING_ENABLED !== 'false',
        shardCount: parseInt(process.env.SHARD_COUNT) || 'auto',
        respawnDelay: parseInt(process.env.RESPAWN_DELAY) || 5000,
        spawnDelay: parseInt(process.env.SPAWN_DELAY) || 5000
    }
};

/**
 * Validate critical configuration
 */
function validateConfig() {
    const errors = [];

    // Check bot token
    if (!config.bot.token) {
        errors.push('⚠️  DISCORD_TOKEN not set in .env');
    }

    // Check owner ID
    if (!config.bot.ownerID) {
        errors.push('⚠️  OWNER_ID not set in .env');
    }

    // Check at least one AI service is configured
    const hasOllama = config.ai.ollama.url;
    const hasOpenrouter = config.ai.openrouter.apiKey;
    const hasGemini = config.ai.gemini.apiKey;

    if (!hasOllama && !hasOpenrouter && !hasGemini) {
        errors.push('⚠️  At least one AI service must be configured (OLLAMA_URL, OPENROUTER_API_KEY, or GEMINI_API_KEY)');
    }

    // Check MongoDB if analytics is enabled
    if (config.logging.analyticsEnabled && !config.database.mongodb.uri) {
        errors.push('⚠️  MONGO_URI not set but analytics are enabled');
    }

    if (errors.length > 0) {
        console.warn('[CONFIG] ⚠️  Configuration warnings:');
        errors.forEach(err => console.warn('  ' + err));
    }

    return errors.length === 0;
}

/**
 * Get config value with dot notation
 * Example: config.get('ai.ollama.url')
 */
function getConfig(path, defaultValue = null) {
    const keys = path.split('.');
    let value = config;

    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }

    return value || defaultValue;
}

/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(featureName) {
    return config.features[featureName] || false;
}

/**
 * Print configuration summary (safe version - no secrets)
 */
function printConfigSummary() {
    console.log('\n[CONFIG] 📋 Configuration Summary:');
    console.log('  Bot Owner ID:', config.bot.ownerID || '❌ Not set');
    console.log('  Dashboard:', `http://localhost:${config.dashboard.port}`);
    console.log('  MongoDB:', config.database.mongodb.uri ? '✅ Configured' : '⚠️  Not configured');
    console.log('  Ollama:', config.ai.ollama.url ? `✅ ${config.ai.ollama.url}` : '⚠️  Not configured');
    console.log('  OpenRouter:', config.ai.openrouter.apiKey ? '✅ Configured' : '⚠️  Not configured');
    console.log('  Gemini:', config.ai.gemini.apiKey ? '✅ Configured' : '⚠️  Not configured');
    console.log('  Sharding:', config.clustering.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('  Analytics:', config.logging.analyticsEnabled ? '✅ Enabled' : '❌ Disabled');
    console.log('');
}

// Validate on load
validateConfig();

module.exports = {
    config,
    getConfig,
    isFeatureEnabled,
    printConfigSummary,
    validateConfig
};
