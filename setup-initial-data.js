/**
 * 🚀 Initial Data Setup Script
 * Sets up the initial conversation examples and knowledge base
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// Import utilities
const initialExamples = require('./utils/initial-conversation-examples');
const pdfProcessor = require('./utils/pdf-processor');

class InitialDataSetup {
    constructor() {
        this.setupResults = [];
    }

    /**
     * Run complete setup
     */
    async runSetup() {
        console.log(chalk.blue('🚀 Starting Initial Data Setup\n'));
        
        try {
            // Connect to MongoDB
            await this.connectToDatabase();
            
            // Setup conversation examples
            await this.setupConversationExamples();
            
            // Setup knowledge base from PDFs
            await this.setupKnowledgeBase();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error(chalk.red('❌ Setup failed:'), error.message);
        } finally {
            await mongoose.disconnect();
        }
    }

    /**
     * Connect to MongoDB
     */
    async connectToDatabase() {
        try {
            const mongoURI = 'mongodb://localhost:27017/luminex';
            console.log(chalk.cyan(`🔗 Connecting to: ${mongoURI}`));
            await mongoose.connect(mongoURI);
            console.log(chalk.green('✅ Connected to MongoDB'));
        } catch (error) {
            console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
            throw error;
        }
    }

    /**
     * Setup conversation examples
     */
    async setupConversationExamples() {
        console.log(chalk.blue('\n💬 Setting up Conversation Examples...'));
        
        try {
            const result = await initialExamples.loadExamples();
            
            console.log(chalk.green(`✅ Loaded ${result.loaded} conversation examples`));
            console.log(chalk.yellow(`⏭️ Skipped ${result.skipped} existing examples`));
            
            // Get statistics
            const stats = await initialExamples.getStats();
            if (stats) {
                console.log(chalk.cyan(`📊 Total examples in database: ${stats.total}`));
                console.log(chalk.cyan(`📂 Categories: ${stats.byCategory.length}`));
                
                stats.byCategory.forEach(cat => {
                    console.log(chalk.cyan(`   - ${cat._id}: ${cat.count} examples`));
                });
            }
            
            this.setupResults.push({ 
                component: 'Conversation Examples', 
                status: 'SUCCESS',
                loaded: result.loaded,
                skipped: result.skipped
            });
            
        } catch (error) {
            console.error(chalk.red('❌ Conversation examples setup failed:'), error.message);
            this.setupResults.push({ 
                component: 'Conversation Examples', 
                status: 'FAILED', 
                error: error.message 
            });
        }
    }

    /**
     * Setup knowledge base from PDFs
     */
    async setupKnowledgeBase() {
        console.log(chalk.blue('\n📄 Setting up Knowledge Base...'));
        
        try {
            // Initialize PDF processor
            const initialized = await pdfProcessor.initialize();
            
            if (initialized) {
                // Process all files
                const processed = await pdfProcessor.processAllFiles();
                
                console.log(chalk.green(`✅ Processed ${processed} files`));
                
                // Get statistics
                const stats = await pdfProcessor.getStats();
                if (stats) {
                    console.log(chalk.cyan(`📊 Total knowledge documents: ${stats.totalDocuments}`));
                    console.log(chalk.cyan(`📂 Categories: ${stats.categories}`));
                }
                
                this.setupResults.push({ 
                    component: 'Knowledge Base', 
                    status: 'SUCCESS',
                    processed: processed
                });
            } else {
                console.log(chalk.yellow('⚠️ PDF processor initialization failed'));
                this.setupResults.push({ 
                    component: 'Knowledge Base', 
                    status: 'FAILED', 
                    error: 'Initialization failed'
                });
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Knowledge base setup failed:'), error.message);
            this.setupResults.push({ 
                component: 'Knowledge Base', 
                status: 'FAILED', 
                error: error.message 
            });
        }
    }

    /**
     * Generate setup report
     */
    generateReport() {
        console.log(chalk.blue('\n📊 Setup Report'));
        console.log(chalk.gray('='.repeat(50)));
        
        const success = this.setupResults.filter(r => r.status === 'SUCCESS').length;
        const failed = this.setupResults.filter(r => r.status === 'FAILED').length;
        
        console.log(chalk.green(`✅ Success: ${success}`));
        console.log(chalk.red(`❌ Failed: ${failed}`));
        console.log(chalk.cyan(`📈 Success Rate: ${Math.round((success / this.setupResults.length) * 100)}%`));
        
        console.log(chalk.blue('\n📋 Component Details:'));
        this.setupResults.forEach(result => {
            const status = result.status === 'SUCCESS' ? chalk.green('✅') : chalk.red('❌');
            console.log(`${status} ${result.component}`);
            
            if (result.loaded !== undefined) {
                console.log(chalk.cyan(`   - Loaded: ${result.loaded}`));
            }
            if (result.skipped !== undefined) {
                console.log(chalk.cyan(`   - Skipped: ${result.skipped}`));
            }
            if (result.processed !== undefined) {
                console.log(chalk.cyan(`   - Processed: ${result.processed}`));
            }
            if (result.error) {
                console.log(chalk.red(`   - Error: ${result.error}`));
            }
        });
        
        console.log(chalk.green('\n🎉 Initial Data Setup Complete!'));
        console.log(chalk.blue('💡 Your Luminex AI is now ready with enhanced learning capabilities!'));
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new InitialDataSetup();
    setup.runSetup().catch(console.error);
}

module.exports = InitialDataSetup;
