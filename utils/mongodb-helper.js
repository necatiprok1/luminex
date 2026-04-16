/**
 * 🗄️ MongoDB Helper Utility
 * Replaces croxydb functionality with MongoDB operations
 * Now with fully implemented GenericData store
 */

const mongoose = require('mongoose');

class MongoDBHelper {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this._GenericData = null;
    }

    /**
     * Lazy-load GenericData model to avoid circular dependencies
     */
    get GenericData() {
        if (!this._GenericData) {
            this._GenericData = require('../models/GenericData');
        }
        return this._GenericData;
    }

    /**
     * Get value from MongoDB collection (simulating croxydb)
     */
    async get(key, collection = 'general') {
        try {
            // Check cache first
            const cacheKey = `${collection}:${key}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Use appropriate model based on collection
            let result;
            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    result = await SystemPrompt.findOne({ guildId: key });
                    break;
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    result = await GuildMemory.find({ guildId: key });
                    break;
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    result = await UserLearningProfile.findOne({ guildId: key.split(':')[0], userId: key.split(':')[1] });
                    break;
                default:
                    // For general data, use GenericData model
                    result = await this.getGenericData(key, collection);
            }

            if (result !== null && result !== undefined) {
                this.cache.set(cacheKey, result);
                setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
            }

            return result;
        } catch (error) {
            console.error(`MongoDB get error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set value in MongoDB collection
     */
    async set(key, value, collection = 'general') {
        try {
            const cacheKey = `${collection}:${key}`;
            
            // Update cache
            this.cache.set(cacheKey, value);
            setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

            // Use appropriate model based on collection
            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    await SystemPrompt.findOneAndUpdate(
                        { guildId: key },
                        { $set: value },
                        { upsert: true, new: true }
                    );
                    break;
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    if (Array.isArray(value)) {
                        await GuildMemory.deleteMany({ guildId: key });
                        await GuildMemory.insertMany(value);
                    } else {
                        await GuildMemory.findOneAndUpdate(
                            { guildId: key, userId: value.userId },
                            { $set: value },
                            { upsert: true, new: true }
                        );
                    }
                    break;
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    const [guildId, userId] = key.split(':');
                    await UserLearningProfile.findOneAndUpdate(
                        { guildId, userId },
                        { $set: value },
                        { upsert: true, new: true }
                    );
                    break;
                default:
                    await this.setGenericData(key, value, collection);
            }

            return true;
        } catch (error) {
            console.error(`MongoDB set error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Delete value from MongoDB
     */
    async delete(key, collection = 'general') {
        try {
            const cacheKey = `${collection}:${key}`;
            this.cache.delete(cacheKey);

            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    await SystemPrompt.deleteOne({ guildId: key });
                    break;
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    await GuildMemory.deleteMany({ guildId: key });
                    break;
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    const [guildId, userId] = key.split(':');
                    await UserLearningProfile.deleteOne({ guildId, userId });
                    break;
                default:
                    await this.deleteGenericData(key, collection);
            }

            return true;
        } catch (error) {
            console.error(`MongoDB delete error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Check if key exists
     */
    async has(key, collection = 'general') {
        const value = await this.get(key, collection);
        return value !== null && value !== undefined;
    }

    /**
     * Get all keys in collection
     */
    async all(collection = 'general') {
        try {
            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    const prompts = await SystemPrompt.find({});
                    return prompts.reduce((acc, prompt) => {
                        acc[prompt.guildId] = prompt;
                        return acc;
                    }, {});
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    const memories = await GuildMemory.find({});
                    return memories.reduce((acc, memory) => {
                        if (!acc[memory.guildId]) acc[memory.guildId] = [];
                        acc[memory.guildId].push(memory);
                        return acc;
                    }, {});
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    const profiles = await UserLearningProfile.find({});
                    return profiles.reduce((acc, profile) => {
                        const key = `${profile.guildId}:${profile.userId}`;
                        acc[key] = profile;
                        return acc;
                    }, {});
                default:
                    return await this.getAllGenericData(collection);
            }
        } catch (error) {
            console.error(`MongoDB all error for collection ${collection}:`, error.message);
            return {};
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    // ══════════════════════════════════════
    // 🗃️ GENERIC DATA OPERATIONS (KEY-VALUE STORE)
    // ══════════════════════════════════════

    /**
     * Get generic data by key
     */
    async getGenericData(key, collection = 'general') {
        try {
            if (mongoose.connection.readyState !== 1) return null;
            
            const doc = await this.GenericData.findOne({ key, collection });
            return doc ? doc.value : null;
        } catch (error) {
            console.error(`GenericData get error for ${collection}:${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set generic data by key
     */
    async setGenericData(key, value, collection = 'general') {
        try {
            if (mongoose.connection.readyState !== 1) return false;
            
            await this.GenericData.findOneAndUpdate(
                { key, collection },
                { 
                    key, 
                    collection, 
                    value, 
                    updatedAt: new Date() 
                },
                { upsert: true, new: true }
            );
            return true;
        } catch (error) {
            console.error(`GenericData set error for ${collection}:${key}:`, error.message);
            return false;
        }
    }

    /**
     * Delete generic data by key
     */
    async deleteGenericData(key, collection = 'general') {
        try {
            if (mongoose.connection.readyState !== 1) return false;
            
            await this.GenericData.deleteOne({ key, collection });
            return true;
        } catch (error) {
            console.error(`GenericData delete error for ${collection}:${key}:`, error.message);
            return false;
        }
    }

    /**
     * Get all generic data in a collection
     */
    async getAllGenericData(collection = 'general') {
        try {
            if (mongoose.connection.readyState !== 1) return {};
            
            const docs = await this.GenericData.find({ collection });
            return docs.reduce((acc, doc) => {
                acc[doc.key] = doc.value;
                return acc;
            }, {});
        } catch (error) {
            console.error(`GenericData all error for ${collection}:`, error.message);
            return {};
        }
    }

    /**
     * Advanced query methods
     */
    async findWithFilter(collection, filter = {}) {
        try {
            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    return await SystemPrompt.find(filter);
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    return await GuildMemory.find(filter);
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    return await UserLearningProfile.find(filter);
                case 'knowledgeBase':
                    const KnowledgeBase = require('../models/KnowledgeBase');
                    return await KnowledgeBase.find(filter);
                case 'conversationExamples':
                    const ConversationExample = require('../models/ConversationExample');
                    return await ConversationExample.find(filter);
                default:
                    return [];
            }
        } catch (error) {
            console.error(`MongoDB findWithFilter error:`, error.message);
            return [];
        }
    }

    /**
     * Update specific fields
     */
    async updateFields(key, updates, collection = 'general') {
        try {
            switch (collection) {
                case 'systemPrompts':
                    const SystemPrompt = require('../models/SystemPrompt');
                    await SystemPrompt.updateOne({ guildId: key }, { $set: updates });
                    break;
                case 'guildMemories':
                    const GuildMemory = require('../models/GuildMemory');
                    await GuildMemory.updateMany({ guildId: key }, { $set: updates });
                    break;
                case 'userProfiles':
                    const UserLearningProfile = require('../models/UserLearningProfile');
                    const [guildId, userId] = key.split(':');
                    await UserLearningProfile.updateOne({ guildId, userId }, { $set: updates });
                    break;
                default:
                    // For generic data, merge updates into existing value
                    const existing = await this.getGenericData(key, collection);
                    if (existing && typeof existing === 'object') {
                        await this.setGenericData(key, { ...existing, ...updates }, collection);
                    } else {
                        await this.setGenericData(key, updates, collection);
                    }
            }
            return true;
        } catch (error) {
            console.error(`MongoDB updateFields error:`, error.message);
            return false;
        }
    }
}

// Create singleton instance
const mongoHelper = new MongoDBHelper();

// Export croxydb-compatible interface
module.exports = {
    get: (key, collection) => mongoHelper.get(key, collection),
    fetch: (key, collection) => mongoHelper.get(key, collection),
    set: (key, value, collection) => mongoHelper.set(key, value, collection),
    delete: (key, collection) => mongoHelper.delete(key, collection),
    has: (key, collection) => mongoHelper.has(key, collection),
    all: (collection) => mongoHelper.all(collection),
    findWithFilter: (collection, filter) => mongoHelper.findWithFilter(collection, filter),
    updateFields: (key, updates, collection) => mongoHelper.updateFields(key, updates, collection),
    clearCache: () => mongoHelper.clearCache(),
    // Raw access to MongoDB helper for advanced operations
    mongo: mongoHelper
};
