/**
 * 🧠 Learning Engine - Continuous AI Evolution
 * Real-time conversation examples, pattern recognition, adaptive prompting
 * Tavily integration for web search context
 */

const db = require('./mongodb-helper');
const axios = require('axios');
const chalk = require('chalk');
const { Conversation } = require('../models/GuildMemory');
const mongoose = require('mongoose');
const { extractTopics } = require('./text-utils');

// Tavily API Configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_BASE_URL = 'https://api.tavily.com/search';

class LearningEngine {
    constructor() {
        this.conversationExamples = new Map(); // guildId -> [examples]
        this.userPatterns = new Map(); // userId -> {communication_style, topics, command_frequency}
        this.MAX_EXAMPLES_PER_GUILD = 50;
        this.UPDATE_INTERVAL = 30000; // 30 saniye
        this.startAutoLearning();
    }

    /**
     * Auto-learning sistem: Her 30 saniyede öğren
     */
    startAutoLearning() {
        setInterval(() => {
            this.learnFromRecentConversations();
        }, this.UPDATE_INTERVAL);
        console.log(chalk.green('[LEARNING] ✅ Auto-learning başlatıldı'));
    }

    /**
     * Son konuşmalardan öğren ve pattern'leri çıkart
     */
    async learnFromRecentConversations() {
        try {
            // MongoDB'den son 100 konuşmayı al
            if (mongoose.connection.readyState !== 1) {
                console.log('[LEARNING] ⏳ MongoDB bağlantısı bekleneniyor...');
                return;
            }

            const recentChats = await Conversation.find()
                .sort({ timestamp: -1 })
                .limit(100)
                .lean();

            if (recentChats.length === 0) return;

            // Guild'lar için örnek öğren
            const guildMap = {};
            const userMap = {};

            for (const chat of recentChats) {
                if (!guildMap[chat.guildId]) {
                    guildMap[chat.guildId] = [];
                    userMap[chat.userId] = {
                        username: chat.username,
                        messageCount: 0,
                        topics: [],
                        commandPatterns: [],
                        responseStyle: []
                    };
                }

                guildMap[chat.guildId].push({
                    user: chat.username,
                    input: chat.userMessage,
                    output: chat.aiResponse,
                    timestamp: chat.timestamp
                });

                // User pattern analysis
                if (!userMap[chat.userId]) {
                    userMap[chat.userId] = {
                        username: chat.username,
                        messageCount: 0,
                        topics: [],
                        commandPatterns: [],
                        responseStyle: []
                    };
                }

                userMap[chat.userId].messageCount++;
                
                // Topic extraction (basit keyword detection)
                const topics = extractTopics(chat.userMessage);
                userMap[chat.userId].topics.push(...topics);

                // Command pattern detection
                if (chat.userMessage.toLowerCase().includes('kanal') || 
                    chat.userMessage.toLowerCase().includes('rol') ||
                    chat.userMessage.toLowerCase().includes('kullanıcı')) {
                    userMap[chat.userId].commandPatterns.push(chat.userMessage);
                }
            }

            // Store guild examples
            for (const [guildId, examples] of Object.entries(guildMap)) {
                this.conversationExamples.set(
                    guildId,
                    examples.slice(0, this.MAX_EXAMPLES_PER_GUILD)
                );
            }

            // Store user patterns
            for (const [userId, patterns] of Object.entries(userMap)) {
                patterns.topics = [...new Set(patterns.topics)]; // Deduplicate
                patterns.commandPatterns = [...new Set(patterns.commandPatterns)];
                this.userPatterns.set(userId, patterns);
            }

            console.log(chalk.cyan(`[LEARNING] 📊 ${Object.keys(guildMap).length} guild'dan ${recentChats.length} örnek öğrenildi`));

        } catch (error) {
            console.warn(chalk.yellow(`[LEARNING] ⚠️ Learning error: ${error.message}`));
        }
    }

    // extractTopics artık text-utils.js'ten geliyor

    /**
     * Tavily Web Search - Bilgi tabanında yoksa web'de ara
     */
    async searchWeb(query, guildId) {
        if (!TAVILY_API_KEY) {
            console.log('[TAVILY] ⚠️ API key eksik');
            return null;
        }

        try {
            console.log(chalk.blue(`[TAVILY] 🌐 Web aramasi: "${query}"`));

            const response = await axios.post(TAVILY_BASE_URL, {
                api_key: TAVILY_API_KEY,
                query: query,
                max_results: 3,
                include_answer: true,
                topic: 'general'
            }, {
                timeout: 10000
            });

            if (response.data && response.data.results) {
                console.log(chalk.green(`[TAVILY] ✅ ${response.data.results.length} sonuç bulundu`));

                // Results'ı hızlı bir şekilde memory'ye kaydet
                const facts = response.data.results.map(r => ({
                    title: r.title,
                    content: r.content,
                    url: r.url
                }));

                // Format için
                return {
                    success: true,
                    answer: response.data.answer || 'Cevap bulunamadı',
                    results: facts,
                    formattedContext: this.formatTavilyResults(facts)
                };
            }

            return null;
        } catch (error) {
            console.warn(chalk.yellow(`[TAVILY] ⚠️ Web search hatası: ${error.message}`));
            return null;
        }
    }

    /**
     * Tavily sonuçlarını prompt'a enjeksiyonu için formatla
     */
    formatTavilyResults(results) {
        if (!results || results.length === 0) return '';

        let formatted = '\n🌐 **WEB ARAMA SONUÇLARI**:\n';
        for (const result of results) {
            formatted += `\n• **${result.title}**\n`;
            formatted += `  ${result.content.substring(0, 150)}...\n`;
            formatted += `  📎 ${result.url}\n`;
        }

        return formatted;
    }

    /**
     * Full adaptive prompt builder
     */
    buildAdaptivePrompt(basePrompt, userId, guildId) {
        let adaptivePrompt = basePrompt;

        // 1. Guild örneklerini ekle
        const examples = this.getGuildExamples(guildId, 3);
        if (examples) {
            adaptivePrompt += '\n\n' + examples;
        }

        // 2. User adaptation ekle
        const userSuffix = this.getAdaptivePromptSuffix(userId);
        if (userSuffix) {
            adaptivePrompt += userSuffix;
        }

        return adaptivePrompt;
    }

    /**
     * Real-time feedback learning
     */
    async recordInteractionQuality(guildId, userId, command, success, feedback = '') {
        try {
            const key = `feedback_${guildId}_${userId}_${command}`;
            const data = (await db.fetch(key)) || { successes: 0, failures: 0, feedback: [] };

            if (success) {
                data.successes++;
            } else {
                data.failures++;
            }

            if (feedback) {
                data.feedback.push({ text: feedback, timestamp: Date.now() });
                if (data.feedback.length > 10) data.feedback = data.feedback.slice(-10);
            }

            await db.set(key, data);
            console.log(chalk.cyan(`[LEARNING] 📝 Feedback kaydedildi: ${command} ${success ? '✅' : '❌'}`));

        } catch (error) {
            console.error(chalk.red(`[LEARNING] ❌ Feedback record hatası: ${error.message}`));
        }
    }

    /**
     * High-confidence komutları önemli konuşmalar olarak kaydet
     */
    async recordCommandSuccess(guildId, userId, userMessage, commandName, params) {
        try {
            const key = `command_success_${guildId}`;
            let data = (await db.fetch(key)) || [];

            data.push({
                userId,
                input: userMessage,
                command: commandName,
                params: params,
                timestamp: Date.now()
            });

            if (data.length > 50) data = data.slice(-50);
            await db.set(key, data);

            console.log(chalk.green(`[LEARNING] ✅ Komut başarısı kaydedildi: ${commandName}`));

        } catch (error) {
            console.error(chalk.red(`[LEARNING] ❌ Command success record hatası: ${error.message}`));
        }
    }
}

module.exports = new LearningEngine();
