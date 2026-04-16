/**
 * Discord OAuth2 Authentication Handler
 * Implements Discord OAuth2 flow for dashboard authentication
 */

// Node.js 18+ has built-in fetch API
const config = require("../config.json");

const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';
const DISCORD_OAUTH2_ENDPOINT = 'https://discord.com/api/oauth2';

class DiscordOAuth2 {
    constructor(clientId, clientSecret, redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    /**
     * Generate Discord OAuth2 login URL
     */
    getLoginUrl() {
        const scopes = ['identify', 'guilds'];
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: scopes.join(' ')
        });
        
        return `https://discord.com/api/oauth2/authorize?${params}`;
    }

    /**
     * Exchange OAuth2 code for access token
     */
    async getAccessToken(code) {
        try {
            const response = await fetch(`${DISCORD_OAUTH2_ENDPOINT}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: this.redirectUri
                }),
                timeout: 10000 // 10 second timeout
            });

            if (!response.ok) {
                let errorMessage = `Discord API Error: ${response.status}`;
                
                if (response.status === 400) {
                    errorMessage = 'Geçersiz OAuth2 kodu. Kodu yeniden deneyin.';
                } else if (response.status === 401) {
                    errorMessage = 'OAuth2 kimlik bilgileri hatalı. Discord Developer Portal ayarlarınızı kontrol edin.';
                } else if (response.status === 429) {
                    errorMessage = 'Çok fazla istek. Discord tarafından sınırlandırıldınız. Lütfen 1 dakika sonra tekrar deneyin.';
                } else if (response.status === 503) {
                    errorMessage = 'Discord API geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
                }
                
                const error = new Error(errorMessage);
                error.status = response.status;
                throw error;
            }

            return await response.json();
        } catch (error) {
            console.error('[OAuth2] Token exchange error:', error.message);
            
            // Handle network errors
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                error.message = 'Discord API\'ye bağlanılamedi. İnternet bağlantınızı kontrol edin.';
            } else if (error.code === 'ETIMEDOUT') {
                error.message = 'Discord API isteği zaman aşımına uğradı. Lütfen tekrar deneyin.';
            }
            
            throw error;
        }
    }

    /**
     * Get user info from Discord
     */
    async getUserInfo(accessToken) {
        try {
            const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                timeout: 10000
            });

            if (!response.ok) {
                let errorMessage = `Discord API Error: ${response.status}`;
                
                if (response.status === 401) {
                    errorMessage = 'OAuth2 token geçersiz veya süresi dolmuş.';
                } else if (response.status === 429) {
                    errorMessage = 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.';
                }
                
                const error = new Error(errorMessage);
                error.status = response.status;
                throw error;
            }

            return await response.json();
        } catch (error) {
            console.error('[OAuth2] User info fetch error:', error.message);
            throw error;
        }
    }

    /**
     * Get user guilds
     */
    async getUserGuilds(accessToken) {
        try {
            const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me/guilds`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                throw new Error(`Discord API Error: ${response.status}`);
            }

            const guilds = await response.json();
            
            // Filter only guilds where user is admin or is bot owner
            return guilds.filter(guild => {
                const permissions = BigInt(guild.permissions);
                const hasAdmin = (permissions & BigInt(8)) === BigInt(8); // Administrator flag = 8
                return hasAdmin;
            });
        } catch (error) {
            console.error('[OAuth2] Guilds fetch error:', error);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const response = await fetch(`${DISCORD_OAUTH2_ENDPOINT}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            if (!response.ok) {
                throw new Error(`Discord API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[OAuth2] Token refresh error:', error);
            throw error;
        }
    }
}

module.exports = DiscordOAuth2;
