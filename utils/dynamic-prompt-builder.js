/**
 * 🎯 Dynamic Prompt Builder Service
 * Builds context-aware, personalized system prompts for Luminex AI
 */

const { buildDynamicPrompt, GLOBAL_PROMPTS, MOOD_PROMPTS, CONTEXT_PROMPTS } = require('./global-prompts');

// Yeni prompt'ları destructuring ile al
const { TECHNICAL_SUPPORT, INTERACTION_SYSTEMS } = GLOBAL_PROMPTS;
const SystemPrompt = require('../models/SystemPrompt');
const UserLearningProfile = require('../models/UserLearningProfile');
const KnowledgeBase = require('../models/KnowledgeBase');
const ConversationExample = require('../models/ConversationExample');
const chalk = require('chalk');
const { detectIntent, extractKeywords } = require('./text-utils');

class DynamicPromptBuilder {
    constructor() {
        this.promptCache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        this.defaultMood = 'Mutlu';
    }

    /**
     * Build comprehensive system prompt for a specific context
     */
    async buildPrompt(context) {
        const {
            guildId,
            userId,
            channelId,
            messageContent,
            channelType = 'text',
            messageType = 'user_message'
        } = context;

        // Generate cache key
        const cacheKey = this.generateCacheKey(context);
        
        // Check cache first
        if (this.promptCache.has(cacheKey)) {
            const cached = this.promptCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.prompt;
            }
        }

        try {
            // Get base system prompt from database
            const systemPrompt = await this.getSystemPrompt(guildId);
            
            // Get user profile for personalization
            const userProfile = await this.getUserProfile(guildId, userId);
            
            // Get relevant knowledge
            const relevantKnowledge = await this.getRelevantKnowledge(context);
            
            // Get conversation examples
            const relevantExamples = await this.getRelevantExamples(context);
            
            // Determine mood
            const currentMood = await this.determineMood(context, userProfile);
            
            // Build the final prompt
            const finalPrompt = await this.constructPrompt({
                systemPrompt,
                userProfile,
                relevantKnowledge,
                relevantExamples,
                currentMood,
                context
            });

            // Cache the result
            this.promptCache.set(cacheKey, {
                prompt: finalPrompt,
                timestamp: Date.now()
            });

            return finalPrompt;
        } catch (error) {
            console.error(chalk.red('[PROMPT_BUILDER] Error building prompt:'), error.message);
            
            // Fallback to basic prompt
            return buildDynamicPrompt({
                mood: this.defaultMood,
                scenario: 'general'
            });
        }
    }

    /**
     * Generate cache key for context
     */
    generateCacheKey(context) {
        const { guildId, userId, channelId, channelType } = context;
        return `${guildId}:${userId}:${channelId}:${channelType}`;
    }

    /**
     * Get system prompt from database with fallback to global
     */
    async getSystemPrompt(guildId) {
        try {
            // Try to get server-specific prompt first
            const serverPrompt = await SystemPrompt.findOne({ 
                guildId, 
                scope: 'server', 
                active: true 
            });
            
            if (serverPrompt) {
                return serverPrompt;
            }

            // Fallback to global prompt
            const globalPrompt = await SystemPrompt.findOne({ 
                guildId: 'global', 
                scope: 'global', 
                active: true 
            });

            if (globalPrompt) {
                return globalPrompt;
            }

            // Create default global prompt if none exists
            return await this.createDefaultGlobalPrompt();
        } catch (error) {
            console.error(chalk.yellow('[PROMPT_BUILDER] Error getting system prompt:'), error.message);
            return null;
        }
    }

    /**
     * Get user learning profile
     */
    async getUserProfile(guildId, userId) {
        try {
            return await UserLearningProfile.findOne({ guildId, userId });
        } catch (error) {
            console.error(chalk.yellow('[PROMPT_BUILDER] Error getting user profile:'), error.message);
            return null;
        }
    }

    /**
     * Get relevant knowledge based on context
     */
    async getRelevantKnowledge(context) {
        try {
            const { messageContent, guildId } = context;
            
            // Extract keywords from message
            const keywords = extractKeywords(messageContent);
            
            // Search knowledge base
            const knowledge = await KnowledgeBase.find({
                guildId: { $in: [guildId, 'global'] },
                $or: [
                    { tags: { $in: keywords } },
                    { title: { $regex: keywords.join('|'), $options: 'i' } }
                ],
                confidence: { $gte: 0.7 }
            }).limit(5);

            return knowledge;
        } catch (error) {
            console.error(chalk.yellow('[PROMPT_BUILDER] Error getting knowledge:'), error.message);
            return [];
        }
    }

    /**
     * Get relevant conversation examples
     */
    async getRelevantExamples(context) {
        try {
            const { messageContent, guildId } = context;
            
            // Extract intent and keywords
            const intent = detectIntent(messageContent);
            const keywords = extractKeywords(messageContent);
            
            // Search for relevant examples
            const examples = await ConversationExample.find({
                guildId: { $in: [guildId, 'global'] },
                $or: [
                    { intent },
                    { tags: { $in: keywords } },
                    { userMessage: { $regex: keywords.join('|'), $options: 'i' } }
                ],
                active: true,
                effectiveness: { $gte: 0.8 }
            }).sort({ 'quality.rating': -1 }).limit(3);

            return examples;
        } catch (error) {
            console.error(chalk.yellow('[PROMPT_BUILDER] Error getting examples:'), error.message);
            return [];
        }
    }

    /**
     * Determine appropriate mood based on context and user
     */
    async determineMood(context, userProfile) {
        const { messageContent } = context;
        
        // Check for mood triggers in message
        for (const [mood, prompt] of Object.entries(MOOD_PROMPTS)) {
            const moodTriggers = this.getMoodTriggers(mood);
            if (moodTriggers.some(trigger => 
                messageContent.toLowerCase().includes(trigger.toLowerCase())
            )) {
                return mood;
            }
        }

        // Use user preference if available
        if (userProfile && userProfile.preferences) {
            // Could add mood preference to user profile
        }

        // Check time-based mood
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 6) {
            return 'Düşünceli'; // Late night
        } else if (hour >= 12 && hour <= 14) {
            return 'Enerjik'; // Lunch time
        }

        return this.defaultMood;
    }

    /**
     * Get mood trigger keywords
     */
    getMoodTriggers(mood) {
        const triggers = {
            Mutlu: ['mutlu', 'sevinçli', 'harika', 'mükemmel', 'güzel', '😊', '🎉'],
            Meraklı: ['merak', 'nedir', 'nasıl', 'neden', 'kimdir', '🔍', '?'],
            Ciddi: ['ciddi', 'önemli', 'resmi', 'iş', '🎯', '⚠️'],
            Şakacı: ['şaka', 'espiri', 'komik', 'güldür', '😄', '🤣'],
            Enerjik: ['enerjik', 'hızlı', 'acil', 'heyecan', '⚡', '🚀'],
            Düşünceli: ['düşün', 'analiz', 'detay', 'neden', '🤔', '📊'],
            Nazik: ['lütfen', 'teşekkür', 'nazik', 'kibar', '💝', '🙏'],
            Espirili: ['zekice', 'akıllıca', 'nüktedan', '🎭', '🧠']
        };
        
        return triggers[mood] || [];
    }

    // detectIntent ve extractKeywords artık text-utils.js'ten geliyor

    /**
     * Construct the final prompt
     */
    async constructPrompt(components) {
        const {
            systemPrompt,
            userProfile,
            relevantKnowledge,
            relevantExamples,
            currentMood,
            context
        } = components;

        let finalPrompt = '';

        // Base identity - HER ZAMAN GLOBAL PROMPT KULLAN
        finalPrompt += GLOBAL_PROMPTS.BASE_IDENTITY + '\n\n';

        // NOT: Eski components kurallarını ATLA - GLOBAL_PROMPTS yeterli

        // Add relevant knowledge
        if (relevantKnowledge && relevantKnowledge.length > 0) {
            finalPrompt += '🧚 İLGİLİ BİLGİLER:\n';
            relevantKnowledge.forEach((knowledge, index) => {
                finalPrompt += `${index + 1}. ${knowledge.title}: ${knowledge.content.substring(0, 200)}...\n`;
            });
            finalPrompt += '\n';
        }

        // Add conversation examples
        if (relevantExamples && relevantExamples.length > 0) {
            finalPrompt += '💬 ÖRNEK KONUŞMALAR:\n';
            relevantExamples.forEach((example, index) => {
                finalPrompt += `Örnek ${index + 1}:\n`;
                finalPrompt += `  Kullanıcı: ${example.userMessage}\n`;
                finalPrompt += `  AI: ${example.aiResponse}\n\n`;
            });
        }

        // Add user personalization
        if (userProfile) {
            finalPrompt += '👤 KULLANICI PROFİLİ:\n';
            if (userProfile.preferences.language) {
                finalPrompt += `- Dil: ${userProfile.preferences.language}\n`;
            }
            if (userProfile.preferences.formality) {
                finalPrompt += `- Resmiyet: ${userProfile.preferences.formality}\n`;
            }
            if (userProfile.preferences.responseLength) {
                finalPrompt += `- Yanıt uzunluğu: ${userProfile.preferences.responseLength}\n`;
            }
            finalPrompt += '\n';
        }

        // Add Discord functionality rules - GÜNCEL KOMUT LİSTESİ
        finalPrompt += '\n' + GLOBAL_PROMPTS.DISCORD_FUNCTIONALITY + '\n\n';

        // Add Interaction Systems (YENİ)
        if (INTERACTION_SYSTEMS) {
            finalPrompt += INTERACTION_SYSTEMS + '\n\n';
        }

        // Add Technical Support (YENİ)
        if (TECHNICAL_SUPPORT) {
            finalPrompt += TECHNICAL_SUPPORT + '\n\n';
        }

        // Add mood (basitleştirilmiş)
        if (MOOD_PROMPTS[currentMood]) {
            finalPrompt += `MOD: ${MOOD_PROMPTS[currentMood]}\n\n`;
        }

        // Add context-specific behavior (basitleştirilmiş)
        const intent = detectIntent(context.messageContent);
        if (CONTEXT_PROMPTS[intent]) {
            finalPrompt += `BAĞLAM: ${CONTEXT_PROMPTS[intent]}\n\n`;
        }

        // Final instructions - DETAYLI YANIT FORMATI
        finalPrompt += `YANIT FORMATI:
────────────────────────────────────────
✅/❌ İşlem sonucu

📝 Açıklama: [Detaylı açıklama]
💡 Öneriler: [Varsa öneriler]
🔧 Komut: [KOMUT:...]

Başka bir konuda yardımcı olabilir miyim?
────────────────────────────────────────

KURALLAR:
- Türkçe yanıt ver
- Detaylı açıkla, örnek ver
- İşlem istendiğinde [KOMUT:...] kullan`;

        return finalPrompt;
    }

    /**
     * Create default global prompt
     */
    async createDefaultGlobalPrompt() {
        try {
            const defaultPrompt = new SystemPrompt({
                guildId: 'global',
                scope: 'global',
                basePrompt: GLOBAL_PROMPTS.BASE_IDENTITY,
                components: {
                    identity: 'Luminex AI - Advanced Discord Bot',
                    purpose: 'Help users and manage server efficiently',
                    rules: [
                        'Always be helpful and respectful',
                        'Never share personal information',
                        'Follow Discord Terms of Service',
                        'Adapt to user communication style',
                        'Use [KOMUT:action:params] for Discord operations',
                        'Only use web search for unknown information'
                    ],
                    guidelines: [
                        'Provide clear and concise answers',
                        'Use appropriate emojis',
                        'Maintain professional yet friendly tone',
                        'Learn from interactions',
                        'Prioritize AI commands over web search for Discord tasks'
                    ]
                },
                moodSystem: {
                    currentMood: this.defaultMood,
                    availableMoods: Object.keys(MOOD_PROMPTS)
                },
                responseConfig: {
                    maxLength: 2000,
                    useEmojis: true,
                    language: 'tr',
                    formality: 'casual'
                },
                learningConfig: {
                    enableLearning: true,
                    adaptFromConversations: true,
                    feedbackIntegration: true
                },
                knowledgeIntegration: {
                    useKnowledgeBase: true,
                    fallbackToGeneral: true,
                    confidenceThreshold: 0.7
                },
                active: true,
                isTemplate: true,
                tags: ['default', 'global', 'ai'],
                category: 'general'
            });

            await defaultPrompt.save();
            console.log(chalk.green('[PROMPT_BUILDER] ✅ Default global prompt created'));
            
            return defaultPrompt;
        } catch (error) {
            console.error(chalk.red('[PROMPT_BUILDER] Error creating default prompt:'), error.message);
            return null;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.promptCache.clear();
        console.log(chalk.blue('[PROMPT_BUILDER] 🧹 Cache cleared'));
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.promptCache.size,
            maxSize: this.promptCache.size * 2000, // Approximate
            hitRate: 'N/A' // Would need to track hits/misses
        };
    }
}

// Create singleton instance
const promptBuilder = new DynamicPromptBuilder();

module.exports = promptBuilder;
