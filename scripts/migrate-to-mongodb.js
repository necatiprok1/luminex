/**
 * 🗄️ MongoDB Migration Script
 * Migrates all data from croxydb to MongoDB with proper validation and backup
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mongoose = require('mongoose');
const croxydb = require('croxydb');

// Import MongoDB models
const SystemPrompt = require('../models/SystemPrompt');
const GuildMemory = require('../models/GuildMemory');
const KnowledgeBase = require('../models/KnowledgeBase');
const ConversationExample = require('../models/ConversationExample');
const UserLearningProfile = require('../models/UserLearningProfile');

class MongoDBMigration {
    constructor() {
        this.migrationLog = [];
        this.errors = [];
        this.startTime = Date.now();
        this.backupDir = path.join(__dirname, '../migration-backups');
    }

    /**
     * Initialize migration process
     */
    async initialize() {
        console.log(chalk.blue('🚀 MongoDB Migration Started'));
        console.log(chalk.gray('═'.repeat(50)));

        // Create backup directory
        await this.createBackupDirectory();
        
        // Connect to MongoDB
        await this.connectToMongoDB();
        
        // Validate MongoDB connection
        await this.validateMongoDB();
        
        console.log(chalk.green('✅ Migration initialized successfully'));
    }

    /**
     * Create backup directory for safety
     */
    async createBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log(chalk.yellow(`📁 Created backup directory: ${this.backupDir}`));
        }
    }

    /**
     * Connect to MongoDB
     */
    async connectToMongoDB() {
        try {
            const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/luminex';
            await mongoose.connect(mongoURI);
            console.log(chalk.green('✅ Connected to MongoDB'));
        } catch (error) {
            console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
            throw error;
        }
    }

    /**
     * Validate MongoDB connection and models
     */
    async validateMongoDB() {
        try {
            // Test basic operations - create indexes for all models
            console.log(chalk.blue('📝 Creating MongoDB indexes...'));
            
            // Direct model indexes
            await SystemPrompt.createIndexes();
            await KnowledgeBase.createIndexes();
            await ConversationExample.createIndexes();
            await UserLearningProfile.createIndexes();
            
            // GuildMemory exported models
            await GuildMemory.Conversation.createIndexes();
            await GuildMemory.Fact.createIndexes();
            await GuildMemory.Stat.createIndexes();
            await GuildMemory.Feedback.createIndexes();
            await GuildMemory.Activity.createIndexes();
            await GuildMemory.Media.createIndexes();
            await GuildMemory.ModLog.createIndexes();
            await GuildMemory.ServerCache.createIndexes();
            await GuildMemory.MemoryStore.createIndexes();
            await GuildMemory.LearningStats.createIndexes();
            
            console.log(chalk.green('✅ MongoDB indexes created'));
        } catch (error) {
            console.error(chalk.red('❌ MongoDB validation failed:'), error.message);
            throw error;
        }
    }

    /**
     * Backup existing croxydb data
     */
    async backupCroxydbData() {
        console.log(chalk.blue('📦 Backing up croxydb data...'));
        
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                data: {}
            };

            // Backup all croxydb collections
            const backupPath = path.join(this.backupDir, `croxydb-backup-${Date.now()}.json`);
            
            // Read all croxydb data (implementation depends on croxydb structure)
            // This is a generic approach - adjust based on actual croxydb usage
            if (fs.existsSync('./croxydb/croxydb.json')) {
                const croxyData = JSON.parse(fs.readFileSync('./croxydb/croxydb.json', 'utf8'));
                backupData.data = croxyData;
            }

            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log(chalk.green(`✅ Backup created: ${backupPath}`));
            
            return backupData;
        } catch (error) {
            console.error(chalk.red('❌ Backup failed:'), error.message);
            throw error;
        }
    }

    /**
     * Migrate system prompts
     */
    async migrateSystemPrompts() {
        console.log(chalk.blue('🔄 Migrating System Prompts...'));
        
        try {
            let migrated = 0;
            
            // Check for existing system prompts in croxydb
            const existingPrompts = croxydb.get('systemPrompts') || {};
            
            for (const [guildId, promptData] of Object.entries(existingPrompts)) {
                try {
                    const systemPrompt = new SystemPrompt({
                        guildId,
                        scope: 'server',
                        basePrompt: promptData.basePrompt || promptData.prompt || 'Default system prompt',
                        components: {
                            identity: 'Luminex AI - Advanced Discord Bot',
                            purpose: 'Help users and manage server',
                            examples: promptData.examples || []
                        },
                        moodSystem: {
                            currentMood: promptData.activeMood || 'Mutlu',
                            availableMoods: ['Mutlu', 'Meraklı', 'Ciddi', 'Şakacı']
                        },
                        customInstructions: promptData.customInstructions || '',
                        version: '1.0',
                        lastUpdatedBy: 'migration_script',
                        updateReason: 'Migrated from croxydb'
                    });

                    await systemPrompt.save();
                    migrated++;
                    
                    this.logMigration('SystemPrompt', guildId, 'SUCCESS');
                } catch (error) {
                    this.logMigration('SystemPrompt', guildId, 'ERROR', error.message);
                    this.errors.push({ type: 'SystemPrompt', guildId, error: error.message });
                }
            }
            
            console.log(chalk.green(`✅ System Prompts migrated: ${migrated}`));
            return migrated;
        } catch (error) {
            console.error(chalk.red('❌ System prompt migration failed:'), error.message);
            throw error;
        }
    }

    /**
     * Migrate guild memories/conversations
     */
    async migrateGuildMemories() {
        console.log(chalk.blue('🔄 Migrating Guild Memories...'));
        
        try {
            let migrated = 0;
            
            // Check for existing memories in croxydb
            const existingMemories = croxydb.get('guildMemories') || {};
            
            for (const [guildId, memoryData] of Object.entries(existingMemories)) {
                try {
                    // Migrate conversations
                    if (memoryData.conversations && Array.isArray(memoryData.conversations)) {
                        for (const conv of memoryData.conversations) {
                            const conversation = new GuildMemory.Conversation({
                                guildId,
                                userId: conv.userId || 'unknown',
                                username: conv.username,
                                userMessage: conv.userMessage,
                                aiResponse: conv.aiResponse,
                                timestamp: conv.timestamp || new Date()
                            });
                            
                            await conversation.save();
                            migrated++;
                        }
                    }
                    
                    this.logMigration('GuildMemory', guildId, 'SUCCESS');
                } catch (error) {
                    this.logMigration('GuildMemory', guildId, 'ERROR', error.message);
                    this.errors.push({ type: 'GuildMemory', guildId, error: error.message });
                }
            }
            
            console.log(chalk.green(`✅ Guild Memories migrated: ${migrated}`));
            return migrated;
        } catch (error) {
            console.error(chalk.red('❌ Guild memory migration failed:'), error.message);
            throw error;
        }
    }

    /**
     * Create initial conversation examples
     */
    async createInitialConversationExamples() {
        console.log(chalk.blue('📝 Creating Initial Conversation Examples...'));
        
        try {
            const examples = this.getInitialExamples();
            let created = 0;
            
            for (const example of examples) {
                try {
                    const convExample = new ConversationExample({
                        guildId: example.guildId || 'global',
                        userId: 'system',
                        username: 'System',
                        userMessage: example.userMessage,
                        aiResponse: example.aiResponse,
                        category: example.category,
                        intent: example.intent,
                        sentiment: 'positive',
                        quality: { rating: 5, helpful: true, accurate: true, appropriate: true },
                        source: 'manual',
                        tags: example.tags || [],
                        active: true
                    });
                    
                    await convExample.save();
                    created++;
                } catch (error) {
                    console.error(chalk.yellow(`⚠️ Failed to create example: ${error.message}`));
                }
            }
            
            console.log(chalk.green(`✅ Initial examples created: ${created}`));
            return created;
        } catch (error) {
            console.error(chalk.red('❌ Failed to create initial examples:'), error.message);
            throw error;
        }
    }

    /**
     * Get initial conversation examples
     */
    getInitialExamples() {
        return [
            // Discord functionality examples
            {
                userMessage: 'yardım komutu nedir?',
                aiResponse: 'Yardım komutu, botun tüm komutlarını ve kullanımlarını gösterir. !yardım veya /help yazarak kullanabilirsiniz.',
                category: 'help_request',
                intent: 'get_help',
                tags: ['komut', 'yardım', 'başlangıç']
            },
            {
                userMessage: 'selam naber?',
                aiResponse: 'Selam! İyiyim, teşekkür ederim 😊 Size nasıl yardımcı olabilirim?',
                category: 'greeting',
                intent: 'greeting',
                tags: ['selamlaşma', 'merhaba']
            },
            {
                userMessage: 'sunucu bilgisi',
                aiResponse: 'Sunucu bilgileri:\n📊 Üye sayısı: {memberCount}\n📅 Kuruluş: {createdAt}\n👑 Sahip: {owner}\n🌟 Seviye: {level}',
                category: 'discord_command',
                intent: 'server_info',
                tags: ['sunucu', 'bilgi', 'istatistik']
            },
            {
                userMessage: 'ataturk kimdir?',
                aiResponse: 'Mustafa Kemal Atatürk (1881-1938), Türkiye Cumhuriyeti\'nin kurucusudur. Türk mareşal, devlet adamı ve yazardır. Milli Mücadele\'yi başlatarak Türkiye\'yi kurtarmış ve modern Türkiye\'nin temellerini atmıştır.',
                category: 'question_answer',
                intent: 'general_knowledge',
                tags: ['ataturk', 'tarih', 'bilgi']
            },
            {
                userMessage: 'kanal oluştur',
                aiResponse: 'Kanal oluşturmak için yönetici yetkisine ihtiyacınız var. /kanal-oluştur komutunu kullanarak yeni kanal oluşturabilirsiniz.',
                category: 'server_management',
                intent: 'create_channel',
                tags: ['kanal', 'yönetim', 'oluşturma']
            },
            // Add more examples...
        ];
    }

    /**
     * Migrate user data and create learning profiles
     */
    async migrateUserProfiles() {
        console.log(chalk.blue('👤 Creating User Learning Profiles...'));
        
        try {
            // This would extract user data from existing memories
            const existingMemories = await GuildMemory.find({});
            const userProfiles = new Map();
            
            for (const memory of existingMemories) {
                const key = `${memory.guildId}-${memory.userId}`;
                if (!userProfiles.has(key)) {
                    userProfiles.set(key, {
                        guildId: memory.guildId,
                        userId: memory.userId,
                        username: memory.username,
                        history: {
                            totalInteractions: 0,
                            lastInteraction: memory.timestamp
                        }
                    });
                }
                
                const profile = userProfiles.get(key);
                profile.history.totalInteractions++;
            }
            
            let created = 0;
            for (const profileData of userProfiles.values()) {
                try {
                    const profile = new UserLearningProfile(profileData);
                    await profile.save();
                    created++;
                } catch (error) {
                    console.error(chalk.yellow(`⚠️ Failed to create user profile: ${error.message}`));
                }
            }
            
            console.log(chalk.green(`✅ User profiles created: ${created}`));
            return created;
        } catch (error) {
            console.error(chalk.red('❌ User profile creation failed:'), error.message);
            throw error;
        }
    }

    /**
     * Log migration events
     */
    logMigration(type, id, status, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            id,
            status,
            error
        };
        
        this.migrationLog.push(logEntry);
        
        if (status === 'SUCCESS') {
            console.log(chalk.green(`✅ ${type} ${id}`));
        } else {
            console.log(chalk.red(`❌ ${type} ${id}: ${error}`));
        }
    }

    /**
     * Generate migration report
     */
    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const report = {
            summary: {
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: `${Math.round(duration / 1000)}s`,
                totalMigrated: this.migrationLog.filter(l => l.status === 'SUCCESS').length,
                totalErrors: this.errors.length
            },
            details: {
                migrations: this.migrationLog,
                errors: this.errors
            }
        };
        
        const reportPath = path.join(this.backupDir, `migration-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(chalk.blue('\n📊 Migration Report:'));
        console.log(chalk.green(`✅ Successfully migrated: ${report.summary.totalMigrated}`));
        console.log(chalk.red(`❌ Errors: ${report.summary.totalErrors}`));
        console.log(chalk.cyan(`⏱️ Duration: ${report.summary.duration}`));
        console.log(chalk.gray(`📄 Report saved: ${reportPath}`));
        
        return report;
    }

    /**
     * Execute complete migration
     */
    async execute() {
        try {
            await this.initialize();
            await this.backupCroxydbData();
            
            const systemPrompts = await this.migrateSystemPrompts();
            const guildMemories = await this.migrateGuildMemories();
            const examples = await this.createInitialConversationExamples();
            const profiles = await this.migrateUserProfiles();
            
            const report = this.generateReport();
            
            console.log(chalk.green('\n🎉 Migration completed successfully!'));
            
            return report;
        } catch (error) {
            console.error(chalk.red('\n💥 Migration failed:'), error.message);
            throw error;
        } finally {
            await mongoose.disconnect();
        }
    }
}

// Execute migration if run directly
if (require.main === module) {
    const migration = new MongoDBMigration();
    migration.execute().catch(console.error);
}

module.exports = MongoDBMigration;
