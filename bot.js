const { Client, GatewayIntentBits, PermissionFlagsBits, Events, Collection, EmbedBuilder, ChannelType, Partials } = require("discord.js");
const fs = require('node:fs');
const path = require('node:path');
const INTENTS = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
];
const client = new Client({ 
    intents: INTENTS,
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.Channel,
        Partials.User,
    ],
});
const config = require("./config.json");
require('dotenv').config();

const chalk = require('chalk');
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { readdirSync } = require("fs");
const moment = require("moment");
const mongoose = require('mongoose');

// ══════════════════════════════════════
// 🛡️ ENV VALIDATION
// ══════════════════════════════════════
const requiredEnvVars = ['TOKEN'];
const optionalEnvVars = ['GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'OLLAMA_URL', 'WEBHOOK_URL', 'ERROR_WEBHOOK_URL'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(chalk.red(`[FATAL] ❌ ${envVar} çevresel değişkeni bulunamadı! .env dosyasını kontrol edin.`));
        process.exit(1);
    }
}

for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
        console.warn(chalk.yellow(`[ENV] ⚠️ ${envVar} ayarlanmamış (opsiyonel)`));
    }
}

console.log(chalk.green('[ENV] ✅ Çevresel değişkenler doğrulandı'));

// ══════════════════════════════════════
// 🗄️ MONGODB CONNECTION & MIGRATION
// ══════════════════════════════════════
if (process.env.MONGO_URI) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
    };

    mongoose.connect(process.env.MONGO_URI, mongoOptions).then(async () => {
        console.log(chalk.green('[DATABASE] ✅ MongoDB veritabanına başarıyla bağlanıldı.'));
        
        // Check if migration is needed
        try {
            const SystemPrompt = require('./models/SystemPrompt');
            const promptCount = await SystemPrompt.countDocuments();
            
            if (promptCount === 0) {
                console.log(chalk.yellow('[DATABASE] 🔄 First-time setup detected, running migration...'));
                try {
                    const MongoDBMigration = require('./scripts/migrate-to-mongodb');
                    await new MongoDBMigration().execute();
                    console.log(chalk.green('[DATABASE] ✅ Migration completed successfully'));
                } catch (migrationError) {
                    console.error(chalk.red('[DATABASE] ❌ Migration failed:'), migrationError.message);
                    console.log(chalk.yellow('[DATABASE] ⚠️ Continuing without migration - some features may not work'));
                }
            } else {
                console.log(chalk.green('[DATABASE] ✅ Database setup complete, skipping migration'));
            }
        } catch (err) {
            console.error(chalk.red('[DATABASE] ⚠️ Database check error:'), err.message);
        }
    }).catch((err) => {
        console.error(chalk.red('[DATABASE] ⚠️ MongoDB bağlantı hatası: '), err.message);
        console.log(chalk.yellow('[DATABASE] ⚠️ MongoDB olmadan devam ediliyor - bazı özellikler çalışmayabilir'));
    });
} else {
    console.warn(chalk.yellow('[DATABASE] ⚠️ MONGO_URI ayarlanmamış - MongoDB olmadan devam ediliyor'));
}

// ══════════════════════════════════════
// 🛡️ ERROR HANDLER
// ══════════════════════════════════════
const errorHandler = require('./utils/error-handler');
errorHandler.init();

let token = process.env.TOKEN;

client.commands = new Collection();
client.slashcommands = new Collection();
client.commandaliases = new Collection();

// Slash komutları saklayacak dizi — ready event'inde kaydedilecek
client.slashCommandData = [];

const rest = new REST({ version: "10" }).setToken(token);

// 🔧 Filter out system files and get only directories
const commandFolders = fs.readdirSync('./commands').filter(file => {
    const stat = fs.statSync(`./commands/${file}`);
    // Skip system files and only include directories
    return stat.isDirectory() && !file.startsWith('.');
});

console.log(chalk.red('[COMMANDS] Loading Commands...'));

for (const folder of commandFolders) {
    try {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const commandPath = `./commands/${folder}/${file}`;
                const command = require(commandPath);
                const commandCategory = folder.toLocaleUpperCase();
                if (command && command.data && typeof command.data.toJSON === 'function') {
                    client.slashCommandData.push(command.data.toJSON());
                    client.slashcommands.set(command.data.name, command);
                    console.log(chalk.cyan('[COMMANDS] ' + command.data.name + ' Yüklendi' + chalk.yellow(' - ') + chalk.red('Kategori: ' + commandCategory)));
                } else {
                    client.commands.set(command.name || file.replace('.js', ''), command);
                    console.log(chalk.yellow('[COMMANDS] ' + file + ' (slash değil veya data yok) yüklendi'));
                }
            } catch (err) {
                console.error(chalk.red('[COMMANDS] HATA yüklerken: ' + file), err);
            }
        }
    } catch (folderErr) {
        console.error(chalk.red('[COMMANDS] HATA folder okunurken: ' + folder), folderErr.message);
    }
}

// ══════════════════════════════════════
// 📦 EVENT HANDLER
// ══════════════════════════════════════
// ready.js dahil tüm event'ler buradan yüklenir
// NOT: bot.js'de ayrı bir client.on(ClientReady) YOKTUR — tüm startup mantığı events/ready.js'dedir
try {
    readdirSync("./events").forEach((file) => {
        if (!file.endsWith('.js') || file.startsWith('.')) return;
        try {
            const event = require(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        } catch (err) {
            console.error(chalk.red('[EVENTS] HATA yüklerken: ' + file), err.message);
        }
    });
    console.log(chalk.green('[EVENTS] ✅ Event handlers loaded'));
} catch (err) {
    console.error(chalk.red('[EVENTS] ❌ Event system error:'), err.message);
}

// ══════════════════════════════════════
// 🌐 DASHBOARD INITIALIZATION
// ══════════════════════════════════════
try {
    const dashboard = require('./dashboard/app');
    dashboard(client);
    console.log(chalk.green('[DASHBOARD] ✅ Web paneli modülü yüklendi'));
} catch (err) {
    console.error(chalk.red('[DASHBOARD] ❌ Panel yüklenirken hata:'), err.message);
}

client.login(process.env.TOKEN);
