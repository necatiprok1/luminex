const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const delay = require('delay');
const modSystem = require('../utils/moderation-system');
const db = require("../utils/mongodb-helper");
const fs = require("node:fs");
const cooldown = require("../utils/cooldown");
const errorHandler = require("../utils/error-handler");

// AI Service
let aiService;
try {
    aiService = require("../utils/ai-service");
} catch (error) {
    console.log("AI Service yüklenemedi:", error.message);
}

// Command Confirmation System
const confirmation = require("../utils/command-confirmation");

// ═══════════════════════════════════════════════════════════
// 🧠 RAG & SELF-EVOLUTION MODULES
// ═══════════════════════════════════════════════════════════
let ragPipeline, contextExtractor, selfEvolution, webSearchTool;
try {
    ragPipeline = require("../utils/rag-pipeline");
    contextExtractor = require("../utils/context-extractor");
    selfEvolution = require("../utils/self-evolution");
    webSearchTool = require("../utils/web-search-tool");
    console.log('[MESSAGEHANDLER] RAG & Evolution modules loaded');
} catch (error) {
    console.warn('[MESSAGEHANDLER] RAG modules not fully initialized:', error.message);
}

// Load lists once
let bannedWords = [];
let bannedLinks = [];
try {
    if (fs.existsSync('kufur-liste.txt')) bannedWords = fs.readFileSync('kufur-liste.txt', 'utf8').split('\n').map(word => word.trim()).filter(Boolean);
    if (fs.existsSync('domain-liste.txt')) bannedLinks = fs.readFileSync('domain-liste.txt', 'utf8').split('\n').map(word => word.trim()).filter(Boolean);
} catch (err) {
    console.log("Liste okuma hatası:", err.message);
}

// Luminex tetikleyicileri
const AI_TRIGGERS = ['luminex', 'hey luminex', 'selam luminex', 'merhaba luminex', 'bot'];

// Çift mesaj önleme için işlenen mesaj ID'leri (Deduplication Lock)
const processingMessages = new Set();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;

        // 🔒 DEDUPLICATION LOCK: Aynı mesaj zaten işleniyorsa atla
        if (processingMessages.has(message.id)) {
            console.log(`[DEDUP] ⚠️ Mesaj ${message.id} zaten işleniyor, atlanıyor.`);
            return;
        }

        const content = message.content.toLowerCase();
        const guildId = message.guild.id;

        // ═══════════════════════════════════════════════════════════
        // 📈 ANALİTİK: MESAJ TAKİBİ
        // ═══════════════════════════════════════════════════════════
        try {
            const analytics = require('../utils/analytics-system');
            analytics.trackMessage(message);
        } catch {}

        // ═══════════════════════════════════════════════════════════
        // 🤖 LUMINEX AI SİSTEMİ (OTONOM & TETİKLEYİCİ)
        // ═══════════════════════════════════════════════════════════
        if (aiService) {
            const client = message.client;
            const botId = client.user.id;

            // 1. Prefix Kontrolü ("Luminex ...")
            const hasPrefix = AI_TRIGGERS.some(trigger => content.startsWith(trigger));

            // 2. Etiket Kontrolü (@Luminex)
            const hasMention = message.mentions.users.has(botId);

            // 3. Yanıt Kontrolü (Botun mesajına yanıt verme)
            let isReplyToBot = false;
            if (message.reference) {
                try {
                    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                    if (repliedMessage.author.id === botId) isReplyToBot = true;
                } catch (err) {
                    console.warn('[MESSAGEHANDLER] ⚠️  Failed to fetch referenced message:', err.message);
                }
            }

            // 4. AKTİF DİNLEME (Active Listening)
            // Eğer son 60 saniye içinde bu kanalda AI konuştuysa, mention atılmasa bile dinle.
            // (db yerine in-memory map kullanıyoruz performans için)
            if (!client.lastAIInteraction) client.lastAIInteraction = new Map();
            const lastInteractionKey = `${message.guild.id}_${message.channel.id}`;
            const lastTime = client.lastAIInteraction.get(lastInteractionKey) || 0;
            const now = Date.now();
            const isInConversationInfo = (now - lastTime) < 60000; // 60 saniye penceresi

            // Ancak çok kısa mesajlara (ok, tmm, vs.) tetiklenmesin, spam olmasın.
            const isWorthResponding = userMessage => userMessage && userMessage.trim().length > 3;

            // Tetiklenme Durumu: Prefix, Mention, Reply veya Aktif Sohbet
            if (hasPrefix || hasMention || isReplyToBot || (isInConversationInfo && isWorthResponding(content))) {
                // ⏱️ Kullanıcı bazlı AI cooldown
                const remaining = cooldown.check('ai', message.author.id);
                if (remaining !== null) {
                    // Mention/prefix ile tetiklendiyse kullanıcıyı bilgilendir, aksi halde sessiz geç
                    if (hasPrefix || hasMention || isReplyToBot) {
                        try {
                            const embed = cooldown.getCooldownEmbed('ai', remaining);
                            await message.reply({ embeds: [embed] });
                        } catch (e) {
                            console.warn('[MESSAGEHANDLER] ⚠️  Failed to send cooldown message:', e.message);
                        }
                    }
                    return;
                }

                // 🔒 LOCK ACQUIRE: Bu mesajı işlemeye başlıyoruz
                processingMessages.add(message.id);

                try {
                    let userMessage = message.content;

                    // Prefix temizle
                    if (hasPrefix) {
                        for (const trigger of AI_TRIGGERS) {
                            if (content.startsWith(trigger)) {
                                userMessage = message.content.slice(trigger.length).trim();
                                break;
                            }
                        }
                    }

                    // Etiket temizle
                    if (hasMention) {
                        userMessage = userMessage.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
                    }

                    // Sadece etiket atılmış ve boş mesaj ise selam ver
                    if ((!userMessage || userMessage.trim().length === 0) && !message.attachments.size) {
                        await message.reply({ content: '👋 Merhaba! Dinliyorum.' });
                        // Interaction süresini güncelle (sohbeti başlatmış sayılır)
                        client.lastAIInteraction.set(lastInteractionKey, Date.now());
                        return;
                    }

                    await message.channel.sendTyping();
                    
                    // ═══════════════════════════════════════════════════════════
                    // 🧠 RAG PIPELINE: Retrieve Context from Knowledge Base
                    // ═══════════════════════════════════════════════════════════
                    let ragContext = '';
                    let webSearchResult = null;
                    
                    if (ragPipeline) {
                        try {
                            const contextResult = await ragPipeline.retrieveContext(guildId, userMessage);
                            
                            if (contextResult.success && contextResult.chunks.length > 0) {
                                ragContext = ragPipeline.formatContextForPrompt(contextResult.chunks);
                                
                                // Check confidence and consider web search
                                const confidence = ragPipeline.calculateConfidence(contextResult.chunks);
                                
                                if (confidence.shouldSearchWeb && webSearchTool && webSearchTool.isEnabled()) {
                                    try {
                                        webSearchResult = await webSearchTool.search(userMessage, guildId);
                                        if (webSearchResult.success && webSearchResult.results.length > 0) {
                                            console.log(`[RAG] 🌐 Web search found ${webSearchResult.results.length} results`);
                                        }
                                    } catch (wsError) {
                                        console.warn(`[RAG] ⚠️ Web search failed: ${wsError.message}`);
                                    }
                                }
                            }
                        } catch (ragError) {
                            console.warn(`[RAG] ⚠️ Context retrieval error: ${ragError.message}`);
                        }
                    }
                    
                    // Inject RAG context into message object for ai-service
                    message.ragContext = ragContext;
                    message.webSearchResult = webSearchResult;
                    
                    const result = await aiService.chat(message, userMessage);

                    // Başarılı olursa interaction süresini güncelle
                    if (result.success) {
                        client.lastAIInteraction.set(lastInteractionKey, Date.now());
                        
                        // ═══════════════════════════════════════════════════════════
                        // 🧬 SELF-EVOLUTION: Learn from Interaction
                        // ═══════════════════════════════════════════════════════════
                        if (selfEvolution) {
                            try {
                                // Extract facts from user message (aggressive learning)
                                const facts = await contextExtractor.extractFromMessage(message, guildId);
                                if (facts.length > 0) {
                                    // Persist facts to memory
                                    await contextExtractor.persistFacts(facts);
                                }
                            } catch (evError) {
                                console.warn(`[EVOLUTION] ⚠️ Learning error: ${evError.message}`);
                            }
                        }
                    }

                    if (!result.success) {
                        // Eğer aktif dinleme ile geldiyse ve hata varsa sessiz kal (spam olmasın)
                        if (!hasPrefix && !hasMention && !isReplyToBot) {
                            throw new Error('SILENT_FAIL'); // Let finally block handle cleanup
                        }

                        await message.reply({ content: result.response || '🧠 Bu aralar zihnim biraz bulanık, lütfen kısa bir süre sonra tekrar dene.' });
                        throw new Error('PROCESSED'); // Trigger finally cleanup
                    }

                    let response = result.response;
                    let commandReport = ''; // Phase 1: Command execution report
                    let failedCommands = []; // Track failed commands for better feedback
                    let allCommandsSucceeded = true; // Track overall success

                    // Komut kontrolü ve çalıştırma
                    if (result.hasCommand || result.hasProposal) {
                        const commands = aiService.parseCommand(response);
                        if (commands && commands.length > 0) {
                            const uniqueCommands = [];
                            const seenCommands = new Set();

                            // Tekrarları önle
                            for (const cmd of commands) {
                                const cmdName = cmd.action || cmd.command || 'unknown';
                                const cmdArgs = cmd.params || cmd.args || [];
                                const commandSignature = `${cmdName}:${Array.isArray(cmdArgs) ? cmdArgs.join(':') : ''}`;
                                if (!seenCommands.has(commandSignature)) {
                                    seenCommands.add(commandSignature);
                                    uniqueCommands.push(cmd);
                                }
                            }

                            // Tehlikeli komutlar - onay gerekli
                            const DANGEROUS_COMMANDS = ['ban', 'kick', 'timeout', 'sil', 'yasakla', 'at', 'sustur', 'delete', 'purge', 'temizle'];

                            for (const cmd of uniqueCommands) {
                                // Sadece KOMUT tipi çalıştırılır, ONERI metin olarak kalır
                                if (cmd.isCommand || (cmd.isCommand === undefined && cmd.type === 'KOMUT')) {
                                    const cmdAction = cmd.action || cmd.command;
                                    const cmdParams = cmd.params || cmd.args || [];
                                    const isDangerous = DANGEROUS_COMMANDS.some(d => cmdAction.toLowerCase().includes(d));

                                    // Komutu response'tan temizle
                                    if (cmd.fullMatch) {
                                        const escapedMatch = cmd.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const cleanRegex = new RegExp(`\\**\\s*${escapedMatch}\\s*\\**`, 'g');
                                        response = response.replace(cleanRegex, '').trim();
                                    }

                                    if (isDangerous) {
                                        // Tehlikeli komut - onay iste
                                        let preview = '';
                                        if (cmdAction.includes('ban') || cmdAction.includes('yasakla')) {
                                            preview = `👤 ${cmdParams[0]} sunucudan yasaklanacak`;
                                        } else if (cmdAction.includes('kick') || cmdAction.includes('at')) {
                                            preview = `👢 ${cmdParams[0]} sunucudan atılacak`;
                                        } else if (cmdAction.includes('timeout') || cmdAction.includes('sustur')) {
                                            preview = `🔇 ${cmdParams[0]} ${cmdParams[1] || 5} dakika susturulacak`;
                                        } else if (cmdAction.includes('sil') || cmdAction.includes('delete') || cmdAction.includes('temizle') || cmdAction.includes('purge')) {
                                            preview = `�️ ${cmdParams[0] || 10} mesaj silinecek`;
                                        } else {
                                            preview = `⚠️ ${cmdAction} işlemi yapılacak`;
                                        }

                                        console.log(`[CONFIRMATION] Onay isteniyor: ${cmdAction} ${cmdParams.join(' ')}`);
                                        await confirmation.requestConfirmation(message, cmdAction, cmdParams, preview);
                                        commandReport += `📋 **${cmdAction}** | ⏳ Onay bekleniyor...\n`;
                                    } else {
                                        // Güvenli komut - direkt çalıştır
                                        console.log(`[AI-CMD] 🚀 Direkt çalıştırılıyor: ${cmdAction} ${cmdParams.join(' ')}`);
                                        try {
                                            const execResult = await aiService.executeCommand(cmd, message, client);
                                            if (execResult && execResult.success) {
                                                commandReport += `✅ **${cmdAction}**: ${execResult.message || 'Başarılı'}\n`;
                                            } else if (execResult) {
                                                commandReport += `❌ **${cmdAction}**: ${execResult.message || 'Başarısız'}\n`;
                                                failedCommands.push({ action: cmdAction, message: execResult.message });
                                            }
                                        } catch (execErr) {
                                            console.error(`[AI-CMD] ❌ Hata:`, execErr);
                                            commandReport += `❌ **${cmdAction}**: Hata - ${execErr.message}\n`;
                                            failedCommands.push({ action: cmdAction, message: execErr.message });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // If commands failed, add warning to response
                    if (failedCommands.length > 0) {
                        const failureWarning = `⚠️ **KOMUTPROBLEMLERİ:** ${failedCommands.length} komut başarısız oldu.`;
                        response = failureWarning + '\n\n' + response;
                    }

                    // Phase 1: Prepend command report if any commands executed
                    if (commandReport) {
                        response = `${'─'.repeat(40)}\n📊 **KOMUT SONUÇLARI:**\n${'─'.repeat(40)}\n${commandReport}${'─'.repeat(40)}\n\n${response}`;
                    }

                    if (!response || response.trim().length === 0) {
                        // Response is empty - still exit gracefully with finally block cleanup
                        console.warn('[AI] ⚠️ Yanıt boş, hiçbir şey gönderilmeyecek');
                        return;
                    }

                    // Log command outcomes
                    if (failedCommands.length > 0) {
                        console.log(`[AI] ⚠️ Uyarı: ${failedCommands.length} komut başarısız oldu!`);
                        failedCommands.forEach(fc => {
                            console.log(`  ❌ ${fc.action}: ${fc.message}`);
                        });
                    } else if (commandReport) {
                        console.log(`[AI] ✅ Tüm komutlar başarılı!`);
                    }

                    // Yanıtı gönder (Uzunluk kontrolü)
                    if (response.length > 2000) {
                        const chunks = response.match(/[\s\S]{1,1990}/g) || [];
                        for (const chunk of chunks) {
                            await message.reply({ content: chunk });
                        }
                    } else {
                        await message.reply({ content: response });
                    }

                } catch (error) {
                    console.error('AI Hatası:', error);
                    try { errorHandler.log('AIMessageError', error); } catch (e) {
                        console.error('[MESSAGEHANDLER] ❌ Error logging failed:', e.message);
                    }
                    // Don't rethrow - let finally cleanup and exit gracefully
                } finally {
                    // 🔓 LOCK RELEASE: İşlem bitti, lock'u kaldır (guaranteed cleanup)
                    processingMessages.delete(message.id);
                }
                return; // AI yanıtladıysa diğer kontrollere gerek yok, return at
            }
        }

        // 🛡️ YAPAY ZEKA MODERASYONu (TÜM MESAJLAR İÇİN)
        // ═══════════════════════════════════════════════════════════
        const kufurEngel = await db.fetch(`kufurengel_${guildId}`);
        if (kufurEngel) {
            const hasPermission = message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!hasPermission) {
                const contentLower = content.toLowerCase();
                const detectedWords = bannedWords.filter(word => contentLower.includes(word.toLowerCase()));
                if (detectedWords.length > 0) {
                    console.log(`[AI MODERATION] ⚠️ Küfür tespit edildi: ${detectedWords.join(', ')} (Kullanıcı: ${message.author.username})`);

                    // Mesajı sil
                    await message.delete().catch(() => { });

                    // Katmanlı Uyarı Sistemi
                    const result = await modSystem.addWarning(
                        message.guild,
                        message.member,
                        message.client.user,
                        "Küfür/Argo Kullanımı",
                        message.content
                    );

                    // AI tarzında çeşitli uyarı mesajları
                    const warningMessages = [
                        `🛡️ Hey ${message.author}, bu tarz kelimeler kullanmasak mı? (Toplam Uyarı: ${result.currentWarns})`,
                        `⚠️ ${message.author}, seviyeyi koruyalım lütfen. (Toplam Uyarı: ${result.currentWarns})`,
                        `🤖 ${message.author}, küfür filtresine takıldın. ${result.punishmentApplied ? `Ceza: **${result.punishment}**` : ''}`
                    ];

                    const randomWarning = warningMessages[Math.floor(Math.random() * warningMessages.length)];

                    message.channel.send(`${randomWarning}`).then(msg => {
                        setTimeout(() => msg.delete().catch(() => { }), 6000);
                    }).catch(() => { });

                    return;
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 🚫 REKLAM ENGEL
        // ═══════════════════════════════════════════════════════════
        const reklamEngel = await db.fetch(`reklamengel_${guildId}`);
        if (reklamEngel) {
            const hasPermission = message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!hasPermission) {
                for (const link of bannedLinks) {
                    if (content.includes(link)) {
                        message.delete().catch(() => { });

                        const result = await modSystem.addWarning(
                            message.guild,
                            message.member,
                            message.client.user,
                            "Link/Reklam Paylaşımı",
                            message.content
                        );

                        message.channel.send(`🚫 ${message.author}, bu sunucuda reklam yapamazsın! (Uyarı: ${result.currentWarns}) ${result.punishmentApplied ? `\nCeza: **${result.punishment}**` : ''}`).then(msg => {
                            setTimeout(() => msg.delete().catch(() => { }), 5000);
                        }).catch(() => { });
                        return;
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 💤 AFK SİSTEMİ
        // ═══════════════════════════════════════════════════════════
        const afkReason = await db.fetch(`afk_${message.author.id}`);
        if (afkReason) {
            await db.delete(`afk_${message.author.id}`);
            await db.delete(`afkDate_${message.author.id}`);
            message.reply({
                content: `👋 Tekrar hoş geldin! AFK durumun kaldırıldı.`,
                allowedMentions: { repliedUser: false }
            }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            }).catch(() => { });
        }

        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async (user) => {
                const afk = await db.fetch(`afk_${user.id}`);
                if (afk) {
                    const afkDate = await db.fetch(`afkDate_${user.id}`);
                    const timestamp = afkDate ? `<t:${Math.floor(afkDate.date / 1000)}:R>` : '';
                    message.reply({
                        content: `💤 **${user.tag}** şu anda AFK: ${afk} ${timestamp}`,
                        allowedMentions: { repliedUser: false }
                    }).catch(() => { });
                }
            });
        }

        // ═══════════════════════════════════════════════════════════
        // 🏆 SEVİYE & XP SİSTEMİ (varsayılan: açık, kapalı yapmak için modül ayarı)
        // ═══════════════════════════════════════════════════════════
        try {
            const levelSystem = require('../utils/level-system');
            const moduleSetting = await db.fetch(`module_${guildId}_seviye-sistemi`);
            const isLevelActive = moduleSetting !== false; // undefined = açık (varsayılan)
            if (isLevelActive) {
                const result = await levelSystem.addXP(guildId, message.author.id, message.author.username);
                if (result && result.leveledUp) {
                    const embed = levelSystem.getLevelUpEmbed(message.author.id, result);
                    message.channel.send({ embeds: [embed] }).catch(() => { });

                    if (message.member) {
                        await levelSystem.checkLevelRoles(guildId, message.member, result.newLevel);
                    }
                }
            }
        } catch (e) {
            // Seviye sistemi hatası sessizce geç
        }

        // ═══════════════════════════════════════════════════════════
        // 🔢 SAYI SAYMA OYUNU (merkezi handler - listener sızıntısı yok)
        // ═══════════════════════════════════════════════════════════
        try {
            const gameData = await db.fetch(`sayisayma_${message.channel.id}`);
            if (gameData && typeof gameData === 'object' && gameData.count != null) {
                const currentCount = gameData.count;
                const lastUser = gameData.lastUser;

                if (message.author.id === lastUser) {
                    await message.reply('Lütfen başka bir kullanıcının sayı girmesini bekleyin.').catch(() => { });
                    return;
                }

                const number = parseInt(message.content, 10);
                if (isNaN(number) || number !== currentCount + 1) {
                    const alreadyWarned = await db.fetch(`warned_${message.channel.id}_${message.author.id}`);
                    if (!alreadyWarned) {
                        await message.react('❌').catch(() => { });
                        const warningMsg = await message.reply('Lütfen sıradaki sayıyı girin.').catch(() => null);
                        await db.set(`warned_${message.channel.id}_${message.author.id}`, true);
                        if (warningMsg && warningMsg.deletable) setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                    }
                } else {
                    await message.react('✅').catch(() => { });
                    await db.set(`sayisayma_${message.channel.id}`, { count: currentCount + 1, lastUser: message.author.id });
                    await message.reply(`Doğru! Son sayı: **${number}**`).catch(() => { });
                }
            }
        } catch (e) { /* sayı-sayma hatası sessiz */ }

        // --- VISION TRENDS LOGGING ---
        if (message.attachments.size > 0) {
            try {
                const fileMemory = require('../utils/memory');
                await fileMemory.logMediaActivity(guildId, message.channel.id);
            } catch (e) { }
        }
    }
};
