const { Client, GatewayIntentBits, PermissionFlagsBits, Events, Collection, EmbedBuilder, ChannelType } = require("discord.js");
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
const client = new Client({ intents: INTENTS });
const config = require("./config.json");
require('dotenv').config();

const chalk = require('chalk');
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { readdirSync } = require("fs");
const moment = require("moment");
const db = require("croxydb");
const mongoose = require("mongoose");

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
// 🗄️ MONGODB CONNECTION
// ══════════════════════════════════════
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log(chalk.green('[DATABASE] ✅ MongoDB veritabanına başarıyla bağlanıldı.'));
    }).catch((err) => {
        console.error(chalk.red('[DATABASE] ❌ MongoDB bağlantı hatası: '), err);
    });
} else {
    console.log(chalk.yellow('[DATABASE] ⚠️ MONGO_URI ayarlanmamış, mevcut veritabanı(croxydb) ile devam ediliyor.'));
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

const rest = new REST({ version: "10" }).setToken(token);

const slashcommands = [];
const commandFolders = fs.readdirSync('./commands');

console.log(chalk.red('[COMMANDS] Loading Commands...'));

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const commandPath = `./commands/${folder}/${file}`;
            const command = require(commandPath);
            const commandCategory = folder.toLocaleUpperCase();
            if (command && command.data && typeof command.data.toJSON === 'function') {
                slashcommands.push(command.data.toJSON());
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
}

client.on(Events.ClientReady, async () => {
    try {
        const registerMode = (process.env.REGISTER_MODE || 'guild').toLowerCase();
        if (registerMode === 'global') {
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: slashcommands,
            });
            console.log(chalk.green(`[COMMANDS] ✅ Global → ${slashcommands.length} komut kaydedildi`));
            // Guild komutlarını temizle (çift görünümü engelle)
            for (const guild of client.guilds.cache.values()) {
                try {
                    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: [] });
                    console.log(chalk.yellow(`[COMMANDS] 🧹 ${guild.name} → Guild komutları temizlendi`));
                } catch (guildErr) {
                    console.error(chalk.red(`[COMMANDS] ❌ ${guild.name} → Guild komut temizleme başarısız: ${guildErr.message}`));
                }
            }
        } else {
            // Global komutları temizle (çift görünümü engelle)
            try {
                await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
                console.log(chalk.yellow(`[COMMANDS] 🧹 Global → Global komutlar temizlendi`));
            } catch (globalErr) {
                console.error(chalk.red(`[COMMANDS] ❌ Global komut temizleme başarısız: ${globalErr.message}`));
            }
            for (const guild of client.guilds.cache.values()) {
                try {
                    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
                        body: slashcommands,
                    });
                    console.log(chalk.green(`[COMMANDS] ✅ ${guild.name} → ${slashcommands.length} komut kaydedildi (anlık)`));
                } catch (guildErr) {
                    console.error(chalk.red(`[COMMANDS] ❌ ${guild.name} → Komut kaydı başarısız: ${guildErr.message}`));
                }
            }
        }
    } catch (error) {
        console.error(chalk.red('[COMMANDS] ❌ Komut kaydı hatası:'), error.message);
    }
    console.log(chalk.red(`[START]`) + chalk.green(` ${client.user.username} Aktif Edildi!`));
    console.log(chalk.cyan(`[STATS] ${slashcommands.length} slash komut kaydedildi | ${client.guilds.cache.size} sunucu`));
});


readdirSync("./events").forEach((file) => {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
});

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
