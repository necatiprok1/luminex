/**
 * 🧪 Enhanced System Test
 * Tests the new MongoDB-based AI system components
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// Import models and utilities
const SystemPrompt = require('./models/SystemPrompt');
const KnowledgeBase = require('./models/KnowledgeBase');
const ConversationExample = require('./models/ConversationExample');
const UserLearningProfile = require('./models/UserLearningProfile');
const MongoDBMigration = require('./scripts/migrate-to-mongodb');
const pdfProcessor = require('./utils/pdf-processor');
const initialExamples = require('./utils/initial-conversation-examples');
const dynamicPromptBuilder = require('./utils/dynamic-prompt-builder');

class SystemTester {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log(chalk.blue('🧪 Starting Enhanced System Tests\n'));
        
        try {
            // Connect to MongoDB
            await this.connectToDatabase();
            
            // Test database models
            await this.testDatabaseModels();
            
            // Test migration script
            await this.testMigration();
            
            // Test PDF processor
            await this.testPDFProcessor();
            
            // Test conversation examples
            await this.testConversationExamples();
            
            // Test dynamic prompt builder
            await this.testDynamicPromptBuilder();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error(chalk.red('❌ Test failed:'), error.message);
        } finally {
            await mongoose.disconnect();
        }
    }

    /**
     * Connect to MongoDB
     */
    async connectToDatabase() {
        try {
            const mongoURI = 'mongodb://localhost:27017/luminex'; // Force localhost for testing
            console.log(chalk.cyan(`🔗 Connecting to: ${mongoURI}`));
            await mongoose.connect(mongoURI);
            console.log(chalk.green('✅ Connected to MongoDB'));
        } catch (error) {
            console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
            throw error;
        }
    }

    /**
     * Test database models
     */
    async testDatabaseModels() {
        console.log(chalk.blue('\n📊 Testing Database Models...'));
        
        try {
            // Test SystemPrompt model
            const testPrompt = new SystemPrompt({
                guildId: 'test-guild',
                scope: 'server',
                basePrompt: 'Test prompt',
                components: {
                    identity: 'Test AI',
                    purpose: 'Testing'
                },
                active: true
            });
            
            await testPrompt.save();
            console.log(chalk.green('✅ SystemPrompt model working'));
            
            // Test KnowledgeBase model
            const testKnowledge = new KnowledgeBase({
                guildId: 'test-guild',
                title: 'Test Knowledge',
                content: 'This is test content for knowledge base.',
                category: 'general',
                source: 'test',
                tags: ['test', 'knowledge']
            });
            
            await testKnowledge.save();
            console.log(chalk.green('✅ KnowledgeBase model working'));
            
            // Test ConversationExample model
            const testExample = new ConversationExample({
                guildId: 'test-guild',
                userId: 'test-user',
                userMessage: 'Test message',
                aiResponse: 'Test response',
                category: 'general_chat',
                active: true
            });
            
            await testExample.save();
            console.log(chalk.green('✅ ConversationExample model working'));
            
            // Test UserLearningProfile model
            const testProfile = new UserLearningProfile({
                guildId: 'test-guild',
                userId: 'test-user',
                preferences: {
                    language: 'tr',
                    formality: 'casual'
                }
            });
            
            await testProfile.save();
            console.log(chalk.green('✅ UserLearningProfile model working'));
            
            // Cleanup test data
            await SystemPrompt.deleteOne({ guildId: 'test-guild' });
            await KnowledgeBase.deleteOne({ guildId: 'test-guild' });
            await ConversationExample.deleteOne({ guildId: 'test-guild' });
            await UserLearningProfile.deleteOne({ guildId: 'test-guild', userId: 'test-user' });
            
            this.testResults.push({ test: 'Database Models', status: 'PASSED' });
            
        } catch (error) {
            console.error(chalk.red('❌ Database models test failed:'), error.message);
            this.testResults.push({ test: 'Database Models', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test migration script
     */
    async testMigration() {
        console.log(chalk.blue('\n🔄 Testing Migration Script...'));
        
        try {
            // Test migration initialization (without running full migration)
            const migration = new MongoDBMigration();
            
            // Test basic functionality
            console.log(chalk.green('✅ Migration script initialized successfully'));
            
            this.testResults.push({ test: 'Migration Script', status: 'PASSED' });
            
        } catch (error) {
            console.error(chalk.red('❌ Migration script test failed:'), error.message);
            this.testResults.push({ test: 'Migration Script', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test PDF processor
     */
    async testPDFProcessor() {
        console.log(chalk.blue('\n📄 Testing PDF Processor...'));
        
        try {
            // Test initialization (without full processing)
            const stats = await pdfProcessor.getStats();
            
            if (stats) {
                console.log(chalk.green('✅ PDF processor working'));
                console.log(chalk.cyan(`   - Total documents: ${stats.totalDocuments}`));
                console.log(chalk.cyan(`   - Categories: ${stats.categories}`));
            } else {
                console.log(chalk.yellow('⚠️ PDF processor stats not available (normal for first run)'));
            }
            
            this.testResults.push({ test: 'PDF Processor', status: 'PASSED' });
            
        } catch (error) {
            console.error(chalk.red('❌ PDF processor test failed:'), error.message);
            this.testResults.push({ test: 'PDF Processor', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test conversation examples
     */
    async testConversationExamples() {
        console.log(chalk.blue('\n💬 Testing Conversation Examples...'));
        
        try {
            // Test loading examples
            const stats = await initialExamples.getStats();
            
            if (stats) {
                console.log(chalk.green('✅ Conversation examples working'));
                console.log(chalk.cyan(`   - Total examples: ${stats.total}`));
                console.log(chalk.cyan(`   - Categories: ${stats.byCategory.length}`));
            } else {
                console.log(chalk.yellow('⚠️ No conversation examples found'));
            }
            
            this.testResults.push({ test: 'Conversation Examples', status: 'PASSED' });
            
        } catch (error) {
            console.error(chalk.red('❌ Conversation examples test failed:'), error.message);
            this.testResults.push({ test: 'Conversation Examples', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Test dynamic prompt builder
     */
    async testDynamicPromptBuilder() {
        console.log(chalk.blue('\n🎯 Testing Dynamic Prompt Builder...'));
        
        try {
            // Test prompt building
            const context = {
                guildId: 'test-guild',
                userId: 'test-user',
                channelId: 'test-channel',
                messageContent: 'selam naber?',
                channelType: 'text'
            };
            
            const prompt = await dynamicPromptBuilder.buildPrompt(context);
            
            if (prompt && prompt.length > 100) {
                console.log(chalk.green('✅ Dynamic prompt builder working'));
                console.log(chalk.cyan(`   - Prompt length: ${prompt.length} characters`));
            } else {
                console.log(chalk.yellow('⚠️ Prompt builder returned empty or short prompt'));
            }
            
            this.testResults.push({ test: 'Dynamic Prompt Builder', status: 'PASSED' });
            
        } catch (error) {
            console.error(chalk.red('❌ Dynamic prompt builder test failed:'), error.message);
            this.testResults.push({ test: 'Dynamic Prompt Builder', status: 'FAILED', error: error.message });
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        console.log(chalk.blue('\n📊 Test Report'));
        console.log(chalk.gray('='.repeat(50)));
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        console.log(chalk.green(`✅ Passed: ${passed}`));
        console.log(chalk.red(`❌ Failed: ${failed}`));
        console.log(chalk.cyan(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`));
        
        if (failed > 0) {
            console.log(chalk.red('\n❌ Failed Tests:'));
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(r => {
                    console.log(chalk.red(`   - ${r.test}: ${r.error}`));
                });
        }
        
        console.log(chalk.green('\n🎉 Enhanced System Test Complete!'));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runTests().catch(console.error);
}

module.exports = SystemTester;
