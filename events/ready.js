const { ActivityType, Events } = require("discord.js");
const chalk = require('chalk');
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} Bot Hazır`);

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
        const slashcommands = client.slashCommandData || [];

        try {
            // ═══════════════════════════════════════════════════════════
            // 🧠 RAG & SELF-EVOLUTION SYSTEM INITIALIZATION
            // ═══════════════════════════════════════════════════════════
            console.log(chalk.blue('\n[STARTUP] 🧠 Initializing RAG & Self-Evolution Systems...\n'));

            let embeddingService, ragPipeline, selfEvolution, webSearchTool, serverStateSync;

            try {
                embeddingService = require('../utils/embedding-service');
                const embeddingReady = await embeddingService.initialize();
                if (!embeddingReady) {
                    console.warn(chalk.yellow('[STARTUP] ⚠️ Embedding service not fully ready (may retry)'));
                }
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ Embedding service initialization failed: ' + error.message));
            }

            try {
                ragPipeline = require('../utils/rag-pipeline');
                console.log(chalk.green('[STARTUP] ✅ RAG Pipeline loaded'));
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ RAG Pipeline loading failed: ' + error.message));
            }

            try {
                selfEvolution = require('../utils/self-evolution');
                const evolutionReady = await selfEvolution.initialize();
                if (evolutionReady) {
                    console.log(chalk.green('[STARTUP] ✅ Self-Evolution System initialized'));
                }
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ Self-Evolution initialization failed: ' + error.message));
            }

            try {
                webSearchTool = require('../utils/web-search-tool');
                const searchReady = await webSearchTool.initialize();
                if (searchReady) {
                    console.log(chalk.green('[STARTUP] ✅ Web Search Tool initialized (Tavily)'));
                } else {
                    console.warn(chalk.yellow('[STARTUP] ⚠️ Web Search Tool disabled (no API key)'));
                }
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ Web Search Tool initialization failed: ' + error.message));
            }

            try {
                serverStateSync = require('../tasks/sync-server-state')(client);
                const syncReady = await serverStateSync.initialize();
                if (syncReady) {
                    console.log(chalk.green('[STARTUP] ✅ Discord Server State Sync initialized'));
                }
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ Server State Sync initialization failed: ' + error.message));
            }

            console.log(chalk.blue('[STARTUP] 🧠 RAG Systems Ready!\n'));

            // ═══════════════════════════════════════════════════════════
            // 📄 PDF PROCESSING SYSTEM INITIALIZATION
            // ═══════════════════════════════════════════════════════════
            try {
                const pdfProcessor = require('../utils/pdf-processor');
                const pdfReady = await pdfProcessor.initialize();
                if (pdfReady) {
                    console.log(chalk.green('[STARTUP] ✅ PDF Processing System initialized'));
                } else {
                    console.warn(chalk.yellow('[STARTUP] ⚠️ PDF Processing System failed to initialize'));
                }
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ PDF Processing System initialization failed: ' + error.message));
            }

            // ═══════════════════════════════════════════════════════════
            // 💬 INITIAL CONVERSATION EXAMPLES SETUP
            // ═══════════════════════════════════════════════════════════
            try {
                const initialExamples = require('../utils/initial-conversation-examples');
                const examplesLoaded = await initialExamples.loadExamples();
                console.log(chalk.green(`[STARTUP] ✅ Loaded ${examplesLoaded.loaded} conversation examples`));
            } catch (error) {
                console.error(chalk.red('[STARTUP] ❌ Conversation examples setup failed: ' + error.message));
            }

            // ═══════════════════════════════════════════════════════════
            // 📝 SLASH COMMAND REGISTRATION
            // ═══════════════════════════════════════════════════════════
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

        // --- AKTİF ÇEKİLİŞLERİ KONTROL ET (Restart Recovery) ---
        try {
            const giveawaySystem = require('../utils/giveaway-system');
            await giveawaySystem.checkActiveGiveaways(client);
            console.log('[GIVEAWAY] 🎉 Aktif çekilişler kontrol edildi');
        } catch (e) {
            console.warn('[GIVEAWAY] Çekiliş kontrolü atlandı:', e.message);
        }

        // ═══════════════════════════════════════════════════════════
        // 🎂 DOĞUM GÜNÜ KONTROL (Her 1 saatte bir)
        // ═══════════════════════════════════════════════════════════
        setInterval(async () => {
            try {
                const birthdaySystem = require('../utils/birthday-system');
                for (const guild of client.guilds.cache.values()) {
                    await birthdaySystem.celebrate(guild, client);
                }
            } catch (e) {
                console.warn('[BIRTHDAY] Doğum günü kontrolü hatası:', e.message);
            }
        }, 3600000); // 1 saat

        // ═══════════════════════════════════════════════════════════
        // 📊 İSTATİSTİK KANALLARI GÜNCELLE (Her 10 dakikada bir)
        // ═══════════════════════════════════════════════════════════
        setInterval(async () => {
            try {
                const statsSystem = require('../utils/stats-channel-system');
                for (const guild of client.guilds.cache.values()) {
                    await statsSystem.update(guild);
                }
            } catch (e) {
                console.warn('[STATS] İstatistik güncelleme hatası:', e.message);
            }
        }, 600000); // 10 dakika

        // --- BOŞ ZAMAN AKTİVİTESİ (Idle Reflection - Proaktif Analiz) ---
        // Her 1 dakikada bir kontrol döngüsü
        setInterval(async () => {
            const db = require('../utils/mongodb-helper');
            const aiModule = require('../utils/ai-service');

            for (const guild of client.guilds.cache.values()) {
                try {
                    // 1. Proaktif Mod Kontrolü
                    const isProactiveEnabled = await db.fetch(`proaktif_mod_${guild.id}`);
                    if (!isProactiveEnabled) continue;

                    // 2. Zamanlama Kontrolü
                    const lastRun = await db.fetch(`last_proactive_run_${guild.id}`) || 0;
                    const intervalMinutes = await db.fetch(`proaktif_aralik_${guild.id}`) || 30;
                    const intervalMs = intervalMinutes * 60 * 1000;

                    if (Date.now() - lastRun < intervalMs) continue;

                    console.log(`[AI PROACTIVE] 🧠 ${guild.name} için analiz zamanı!`);

                    // Analiz Yap
                    const thoughtResult = await aiModule.idleReflection(guild);

                    if (thoughtResult && thoughtResult.shouldSpeak) {
                        // 3. Kanal Seçimi
                        let targetChannel;
                        const configuredChannels = await db.fetch(`proaktif_kanallar_${guild.id}`) || [];

                        if (Array.isArray(configuredChannels) && configuredChannels.length > 0) {
                            const randomChannelId = configuredChannels[Math.floor(Math.random() * configuredChannels.length)];
                            targetChannel = guild.channels.cache.get(randomChannelId);
                        }

                        if (!targetChannel) {
                            targetChannel = guild.systemChannel ||
                                guild.channels.cache.find(c => c.name.includes('genel') || c.name.includes('chat')) ||
                                guild.channels.cache.find(c => c.type === 0);
                        }

                        if (targetChannel) {
                            console.log(`[AI PROACTIVE] 🗣️ Mesaj gönderiliyor: ${guild.name} / #${targetChannel.name}`);

                            const content = thoughtResult.content;
                            if (content.length > 2000) {
                                const chunks = content.match(/[\s\S]{1,1990}/g) || [];
                                for (const chunk of chunks) {
                                    await targetChannel.send(chunk);
                                }
                            } else {
                                await targetChannel.send(content);
                            }

                            await db.set(`last_proactive_run_${guild.id}`, Date.now());
                        }
                    }
                } catch (err) {
                    console.error(`[AI PROACTIVE] Hata (${guild.name}):`, err.message);
                }
            }
        }, 60000); // Her dakika kontrol et
    }
};