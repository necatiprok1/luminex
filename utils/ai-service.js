/**
 * 🤖 Enhanced Luminex AI Service - v3.0
 * MongoDB-based, Dynamic Prompt Builder, Learning System
 */

const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("./mongodb-helper");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const fileMemory = require('./memory');
const { executeAICommand } = require('./ai-commands');
const registryModule = require('./ai_commands/registry');
const learningEngine = require('./learning-engine');
const ragPipeline = require('./rag-pipeline');
const SystemPrompt = require('../models/SystemPrompt');
const mongoose = require('mongoose');
const dynamicPromptBuilder = require('./dynamic-prompt-builder');
const { detectIntent } = require('./text-utils');

moment.locale('tr');

// Model Konfigürasyonları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free';
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

const MOODS = ["Mutlu", "Meraklı", "Ciddi", "Şakacı", "Enerjik", "Düşünceli", "Nazik", "Espirili"];
let currentMood = "Mutlu";

// ══════════════════════════════════════
// 🤖 AI MODEL INTERFACES
// ══════════════════════════════════════

class AIModelInterface {
    constructor() {
        this.models = {
            ollama: new OllamaModel(),
            openrouter: new OpenRouterModel(),
            gemini: new GeminiModel()
        };
    }

    async generateResponse(prompt, options = {}) {
        const { temperature = 0.7, maxTokens = 2000 } = options;

        // 🔄 Fallback chain: Ollama → OpenRouter → Gemini → Error
        const fallbackChain = ['ollama', 'openrouter', 'gemini'];
        const errors = {};

        for (const modelName of fallbackChain) {
            try {
                console.log(`[AI_MODEL] 🔄 Attempting ${modelName}...`);
                const aiModel = this.models[modelName];
                const response = await aiModel.generate(prompt, { temperature, maxTokens });
                console.log(`[AI_MODEL] ✅ ${modelName} succeeded`);
                return response;
            } catch (error) {
                errors[modelName] = error.message;
                console.warn(`[AI_MODEL] ⚠️  ${modelName} failed:`, error.message);
                // Continue to next fallback
            }
        }

        // All models failed - log and return graceful error
        console.error('[AI_MODEL] ❌ All AI models failed:', JSON.stringify(errors, null, 2));
        throw new Error(`All AI models failed. Details: ${JSON.stringify(errors)}`);
    }
}

class OllamaModel {
    async generate(prompt, options) {
        const axios = require('axios');

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: options.temperature,
                num_predict: options.maxTokens
            }
        });

        return response.data.response;
    }
}

class OpenRouterModel {
    async generate(prompt, options) {
        const axios = require('axios');

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }
}

class GeminiModel {
    async generate(prompt, options) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}

// ══════════════════════════════════════
// 🎯 ENHANCED AI SERVICE
// ══════════════════════════════════════

class EnhancedAIService {
    constructor() {
        this.aiModel = new AIModelInterface();
        this.conversationHistory = new Map();
        this.conversationTimestamps = new Map(); // Track TTL for cleanup
        this.userProfiles = new Map();
        this.responseCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // 🧹 Memory cleanup: Run cleanup every hour
        this.historyTTL = 24 * 60 * 60 * 1000; // 24 hours
        this.maxHistorySize = 10000; // Max entries in conversation history
        this.startMemoryCleanup();
    }

    /**
     * Start periodic memory cleanup to prevent leaks
     */
    startMemoryCleanup() {
        // Cleanup every 1 hour
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldConversations();
        }, 60 * 60 * 1000);

        // Also cleanup cache
        setInterval(() => {
            this.cleanupResponseCache();
        }, 30 * 60 * 1000); // Every 30 minutes
    }

    /**
     * Remove conversation histories older than TTL
     */
    cleanupOldConversations() {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, timestamp] of this.conversationTimestamps.entries()) {
            if (now - timestamp > this.historyTTL) {
                this.conversationHistory.delete(key);
                this.conversationTimestamps.delete(key);
                removedCount++;
            }
        }

        // If still too large, remove oldest entries
        if (this.conversationHistory.size > this.maxHistorySize) {
            const entriesToRemove = this.conversationHistory.size - this.maxHistorySize;
            const keys = Array.from(this.conversationTimestamps.entries())
                .sort((a, b) => a[1] - b[1]) // Sort by timestamp ascending
                .slice(0, entriesToRemove)
                .map(([key]) => key);

            keys.forEach(key => {
                this.conversationHistory.delete(key);
                this.conversationTimestamps.delete(key);
                removedCount++;
            });
        }

        if (removedCount > 0) {
            console.log(`[AI-SERVICE] 🧹 Cleaned up ${removedCount} old conversation histories. Remaining: ${this.conversationHistory.size}`);
        }
    }

    /**
     * Cleanup old cached responses
     */
    cleanupResponseCache() {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, data] of this.responseCache.entries()) {
            if (now - data.timestamp > this.cacheTimeout) {
                this.responseCache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`[AI-SERVICE] 🧹 Cleaned up ${removedCount} cached responses. Remaining: ${this.responseCache.size}`);
        }
    }

    /**
     * Stop memory cleanup (call when shutting down)
     */
    stopMemoryCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            console.log('[AI-SERVICE] ✅ Memory cleanup interval stopped');
        }
    }

    /**
     * Process user message and generate AI response
     */
    async processMessage(message, client) {
        try {
            const startTime = Date.now();
            const { guild, author, channel, content } = message;

            // Build context
            const context = {
                guildId: guild.id,
                userId: author.id,
                channelId: channel.id,
                messageContent: content,
                channelType: channel.type === 1 ? 'dm' : 'text',
                messageType: 'user_message'
            };

            // Build dynamic system prompt
            const systemPrompt = await dynamicPromptBuilder.buildPrompt(context);

            // Get conversation history
            const history = this.getConversationHistory(context);

            // Build full prompt
            const fullPrompt = this.buildFullPrompt(systemPrompt, content, history);

            // Generate AI response
            const aiResponse = await this.aiModel.generateResponse(fullPrompt, {
                model: 'ollama',
                temperature: 0.7,
                maxTokens: 2000
            });

            // Update conversation history
            this.updateConversationHistory(context, content, aiResponse);

            // Learning and analytics
            await this.processLearning(context, content, aiResponse);

            const responseTime = Date.now() - startTime;

            return {
                response: aiResponse,
                responseTime: responseTime,
                context: context,
                systemPrompt: systemPrompt
            };

        } catch (error) {
            console.error(chalk.red('[AI_SERVICE] ❌ Message processing failed:'), error.message);

            return {
                response: 'Üzgünüm, bir şeyler ters gitti. Lütfen tekrar deneyin.',
                error: error.message
            };
        }
    }

    /**
     * Build full prompt with history
     */
    buildFullPrompt(systemPrompt, userMessage, history) {
        let fullPrompt = systemPrompt + '\n\n';

        // Add conversation history (last 3 messages)
        if (history.length > 0) {
            fullPrompt += '💬 SON KONUŞMALAR:\n';
            history.forEach((msg, index) => {
                fullPrompt += `${index + 1}. Kullanıcı: ${msg.user}\n`;
                fullPrompt += `   AI: ${msg.ai}\n\n`;
            });
        }

        // Add current message
        fullPrompt += '📝 MEVCUT MESAJ:\n';
        fullPrompt += `Kullanıcı: ${userMessage}\n`;
        fullPrompt += 'AI: ';

        return fullPrompt;
    }

    /**
     * Get conversation history
     */
    getConversationHistory(context) {
        const key = `${context.guildId}:${context.userId}`;
        const history = this.conversationHistory.get(key) || [];
        return history.slice(-3); // Last 3 messages
    }

    /**
     * Update conversation history
     */
    updateConversationHistory(context, userMessage, aiResponse) {
        const key = `${context.guildId}:${context.userId}`;
        const history = this.conversationHistory.get(key) || [];

        history.push({
            user: userMessage,
            ai: aiResponse,
            timestamp: new Date()
        });

        // Keep only last 10 messages
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }

        this.conversationHistory.set(key, history);
        // Update timestamp for TTL tracking
        this.conversationTimestamps.set(key, Date.now());
    }

    /**
     * Process learning and analytics
     */
    async processLearning(context, userMessage, aiResponse) {
        try {
            // Save conversation to database
            const ConversationExample = require('../models/ConversationExample');
            const intent = detectIntent(userMessage);
            const sentiment = this.detectSentiment(userMessage);

            const example = new ConversationExample({
                guildId: context.guildId,
                userId: context.userId,
                username: context.userId, // Would need to fetch from Discord
                userMessage: userMessage,
                aiResponse: aiResponse,
                category: this.categorizeMessage(userMessage),
                intent: intent,
                sentiment: sentiment,
                quality: { rating: 4, helpful: true, accurate: true, appropriate: true },
                source: 'automatic',
                tags: this.extractTags(userMessage),
                active: true,
                metrics: {
                    responseTime: 1500,
                    userSatisfaction: 0, // Would need user feedback
                    wasResolved: true
                }
            });

            await example.save();

            // Update user profile
            await this.updateUserProfile(context, userMessage, aiResponse);

        } catch (error) {
            console.error(chalk.yellow('[AI_SERVICE] ⚠️ Learning processing failed:'), error.message);
        }
    }

    // detectIntent artık text-utils.js'ten geliyor

    /**
     * Detect sentiment
     */
    detectSentiment(message) {
        const positiveWords = ['harika', 'güzel', 'mükemmel', 'teşekkür', 'sağol', '😊', '❤️'];
        const negativeWords = ['kötü', 'berbat', 'saçma', 'aptal', 'sinirli', '😡', '😠'];

        const messageLower = message.toLowerCase();

        if (positiveWords.some(word => messageLower.includes(word))) {
            return 'positive';
        } else if (negativeWords.some(word => messageLower.includes(word))) {
            return 'negative';
        }

        return 'neutral';
    }

    /**
     * Categorize message
     */
    categorizeMessage(message) {
        const intent = detectIntent(message);

        const categoryMap = {
            'help_request': 'help_request',
            'greeting': 'greeting',
            'farewell': 'farewell',
            'question_answer': 'question_answer',
            'discord_command': 'discord_command',
            'general_chat': 'general_chat'
        };

        return categoryMap[intent] || 'general_chat';
    }

    /**
     * Extract tags from message
     */
    extractTags(message) {
        const words = message.toLowerCase()
            .replace(/[^\w\sğüşiöç]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 5);

        return [...new Set(words)];
    }

    /**
     * Update user profile
     */
    async updateUserProfile(context, userMessage, aiResponse) {
        try {
            const UserLearningProfile = require('../models/UserLearningProfile');

            const profile = await UserLearningProfile.findOneAndUpdate(
                { guildId: context.guildId, userId: context.userId },
                {
                    $inc: { 'history.totalInteractions': 1 },
                    $set: { 'history.lastInteraction': new Date() },
                    $push: {
                        'patterns.activeHours': {
                            hour: new Date().getHours(),
                            frequency: 1
                        }
                    }
                },
                { upsert: true, new: true }
            );

            return profile;
        } catch (error) {
            console.error(chalk.yellow('[AI_SERVICE] ⚠️ User profile update failed:'), error.message);
        }
    }

    /**
     * Get AI statistics
     */
    getStats() {
        return {
            conversationHistory: this.conversationHistory.size,
            cachedResponses: this.responseCache.size,
            currentMood: currentMood,
            models: Object.keys(this.aiModel.models)
        };
    }

    /**
     * Clear caches
     */
    clearCaches() {
        this.conversationHistory.clear();
        this.responseCache.clear();
        dynamicPromptBuilder.clearCache();
    }

    /**
     * Chat function (backward compatibility with old ai-service API)
     * Supports both (message, content) and (guildId, userId, username, content) signatures
     */
    async chat(input1, input2, username = "Kullanıcı", extraPrompt = "", targetChannel = null) {
        let guildId, userId, content, authorName;

        // input1, Discord Message objesi mi?
        if (typeof input1 === 'object' && input1.guild) {
            guildId = input1.guild.id;
            userId = input1.author.id;
            content = input2;
            authorName = input1.author.username;
        } else {
            // Direkt parametre geçilmiş (örn: guildMemberAdd)
            guildId = input1;
            userId = input2;
            authorName = username;
            content = extraPrompt;
        }

        // AI Mod Kontrolü
        const isAIActive = (await db.fetch(`aimod_${guildId}`)) !== false;
        if (!isAIActive) return { success: false, response: "AI Kapalı." };

        try {
            // RAG Pipeline kullanarak context al
            let ragContext = '';
            let confidence = { shouldSearchWeb: true };

            try {
                const ragResult = await ragPipeline.retrieveContext(guildId, content);
                if (ragResult.success && ragResult.chunks.length > 0) {
                    ragContext = ragPipeline.formatContextForPrompt(ragResult.chunks);
                    confidence = ragPipeline.calculateConfidence(ragResult.chunks);
                }
            } catch (ragErr) {
                console.error("[AI] RAG Error:", ragErr.message);
            }

            const recentContext = await fileMemory.getRecentContext(guildId, 5);

            // Web Search context - ONLY for unknown topics
            let webSearchContext = '';
            // Only search web if confidence is low (unknown topic) AND not a Discord command query
            const isDiscordCommandQuery = /(ban|kick|timeout|sil|kanal|rol|otorol|hosgeldin|duyuru|kullanici)/i.test(content);
            if (confidence.shouldSearchWeb && !isDiscordCommandQuery && content.length > 5) {
                try {
                    const webResult = await learningEngine.searchWeb(content, guildId);
                    if (webResult && webResult.success) {
                        webSearchContext = webResult.formattedContext;
                        console.log(chalk.green('[AI] 🌐 Web search context enjekte edildi'));
                    }
                } catch (webErr) {
                    console.warn(chalk.yellow(`[AI] Web search error: ${webErr.message}`));
                }
            } else if (isDiscordCommandQuery) {
                console.log(chalk.yellow('[AI] 🚫 Web search skipped - Discord command query detected'));
            }

            // Kullanıcı hafızasını yükle (MongoDB gerekli)
            let userContext = '';
            let memory = null;
            try {
                const UserMemory = require('../models/UserMemory');
                if (mongoose.connection.readyState === 1) { // MongoDB bağlıysa
                    memory = await UserMemory.findOne({ guildId, userId });
                    if (!memory) {
                        memory = new UserMemory({
                            guildId,
                            userId,
                            username: authorName,
                        });
                    }

                    // Son konuşmaları prompt'a ekle
                    const recent = memory.getRecentConversations(5);
                    if (recent.length > 0) {
                        userContext = '\n\n[SİZİNLE ÖNCEKİ KONUŞMALAR]\n' +
                            recent.map(c => `${c.role === 'user' ? 'Kullanıcı' : 'Yapay Zeka'}: ${c.content}`).join('\n');
                    }

                    // Yeni mesajı kaydet
                    await memory.addMessage('user', content);
                }
            } catch (e) {
                console.warn('[AI] ⚠️ UserMemory hatası:', e.message);
            }

            const additionalContext = `
[BAĞLAM (KNOWLEDGE/MEMORY)]
${ragContext || 'Herhangi bir özel döküman veya hafıza bulunamadı.'}

[SON SOHBETLER]
${recentContext}
${userContext}

${webSearchContext ? `${webSearchContext}\n` : ''}

[GÖREV]
Kullanıcı (${authorName}) şunu dedi: "${content}"
`;

            // Build system prompt
            const systemPrompt = await dynamicPromptBuilder.buildPrompt({
                guildId,
                userId,
                messageContent: content,
                channelType: 'text',
                messageType: 'user_message'
            });

            const fullPrompt = systemPrompt + '\n' + additionalContext;

            // Generate AI response
            let aiResponse = null;
            let lastError = "";

            try {
                console.log(`[AI] 🤖 Generating response...`);
                aiResponse = await this.aiModel.generateResponse(fullPrompt, {
                    model: 'ollama',
                    temperature: 0.7,
                    maxTokens: 2000
                });
                if (aiResponse) {
                    console.log("[AI] ✅ Başarılı!");
                }
            } catch (err) {
                console.error("[AI] ❌ All fallback models failed:", err.message);
                lastError = err.message;
                aiResponse = null; // Ensure it's null for fallback check
            }

            if (!aiResponse) {
                const errorMsg = lastError || "Tüm AI modelleri başarısız oldu, lütfen daha sonra tekrar dene.";
                return { success: false, response: errorMsg, error: lastError };
            }

            // Hafızaya kaydet
            await fileMemory.logConversation(guildId, userId, authorName, content, aiResponse);

            // Kullanıcı hafızasına AI yanıtını kaydet
            if (memory) {
                try {
                    await memory.addMessage('assistant', aiResponse);
                } catch (e) {
                    console.warn('[AI] ⚠️ Yardımcı yanıt kaydedilemedi:', e.message);
                }
            }

            return {
                success: true,
                response: aiResponse,
                hasCommand: aiResponse.includes('[KOMUT:'),
                hasProposal: aiResponse.includes('[ONERI:')
            };

        } catch (err) {
            console.error("[AI CHAT FATAL]:", err);
            return { success: false, response: null, error: err.message };
        }
    }

    /**
     * Idle Reflection - Proaktif sunucu analizi
     */
    async idleReflection(guild) {
        if (!guild) return null;
        console.log(`[REFLECTION] 🧠 ${guild.name} analiz ediliyor...`);

        try {
            // Verileri logla
            await fileMemory.logStat(guild.id, 'memberCount', guild.memberCount);

            const activityReport = await fileMemory.getActivityReport(guild.id);

            const prompt = `Sen Luminex AI'sın, Türkiye'nin en gelişmiş Discord botusun.
Sunucu: ${guild.name}
Üye sayısı: ${guild.memberCount}
Aktivite durumu: ${activityReport}

GÖREV: Sunucuyu analiz et ve kısa bir öneri ver.
- Eğer sunucu sessizse sohbeti canlandıracak bir şey öner
- Eğer aktifse teknik bir öneri yap
- Kısa ve Türkçe yanıt ver
Önerini [ONERI:komut:parametre] formatında yazabilirsin.`;

            let thought = null;

            try {
                thought = await this.aiModel.generateResponse(prompt, {
                    model: 'ollama',
                    temperature: 0.7,
                    maxTokens: 500
                });
            } catch (err) {
                console.warn("[REFLECTION] Model hatası:", err.message);
                return null;
            }

            return { shouldSpeak: true, content: thought };

        } catch (e) {
            console.error("[REFLECTION ERROR]:", e.message);
            return null;
        }
    }

    /**
     * Parse command from AI response
     * @returns {Array|null} Standartlaştırılmış komut dizisi: [{ command, action, params, isCommand, fullMatch }]
     */
    parseCommand(text) {
        const commands = [];
        const regex = /\[(KOMUT|ONERI):([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const type = match[1];
            const paramsString = match[2];

            // Smart parameter parsing
            const args = this.smartParamParse(paramsString);
            const action = args[0];
            const params = args.slice(1);

            commands.push({
                fullMatch: match[0],
                type: type, // 'KOMUT' veya 'ONERI'
                isCommand: type === 'KOMUT',
                isProposal: type === 'ONERI',
                command: action, // Standart alan
                action: action,  // Alternatif alan
                params: params,  // Standart alan
                args: params     // Alternatif alan
            });
        }
        return commands.length > 0 ? commands : null;
    }

    /**
     * Smart parameter parser
     */
    smartParamParse(text) {
        const params = [];
        let current = '';
        let inQuotes = false;
        let escapeNext = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (escapeNext) {
                current += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\' && nextChar === '"') {
                current += '"';
                escapeNext = true;
                i++;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }

            if (char === ':' && !inQuotes) {
                if (current.trim()) {
                    params.push(current.trim());
                }
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            params.push(current.trim());
        }

        return params;
    }
    /**
     * Execute AI command
     * @param {Object} cmdData - { command, action, params } parseCommand çıktısı
     * @param {Object} message - Discord message object
     * @param {Object} client - Discord client
     */
    async executeCommand(cmdData, message, client) {
        const command = cmdData.command || cmdData.action;
        const params = cmdData.params || cmdData.args || [];

        console.log(`[AI-SERVICE] 🚀 executeCommand: ${command} | Params: ${params.join(', ') || 'Yok'}`);

        const { executeAICommand } = require('./ai-commands');
        const result = await executeAICommand(
            { command, params }, // Standart format
            message,
            client
        );

        console.log(`[AI-SERVICE] ✅ executeCommand sonuç:`, result);
        return result;
    }
}

// Create singleton instance
const enhancedAIService = new EnhancedAIService();

module.exports = enhancedAIService;
