const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("croxydb");
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
                } catch (err) { }
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
                        } catch (e) { }
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
                    const result = await aiService.chat(message, userMessage);

                    // Başarılı olursa interaction süresini güncelle
                    if (result.success) {
                        client.lastAIInteraction.set(lastInteractionKey, Date.now());
                    }

                    if (!result.success) {
                        // Eğer aktif dinleme ile geldiyse ve hata varsa sessiz kal (spam olmasın)
                        if (!hasPrefix && !hasMention && !isReplyToBot) return;

                        await message.reply({ content: result.response || '❌ Bir hata oluştu.' });
                        return;
                    }

                    let response = result.response;

                    // Komut kontrolü
                    if (result.hasCommand || result.hasProposal) {
                        const commands = aiService.parseCommand(response);
                        if (commands && commands.length > 0) {
                            const uniqueCommands = [];
                            const seenCommands = new Set();

                            for (const cmd of commands) {
                                // Komut ve parametrelerin birleşimi bir imza oluşturur
                                const commandSignature = `${cmd.command}:${cmd.params.join(':')}`;
                                if (!seenCommands.has(commandSignature)) {
                                    seenCommands.add(commandSignature);
                                    uniqueCommands.push(cmd);
                                }
                            }

                            for (const cmd of uniqueCommands) {
                                // Komutsa direkt çalıştır, öneri ise sadece metin olarak kalır
                                if (cmd.type === 'KOMUT') {
                                    const commandResult = await aiService.executeCommand(cmd, message, message.client);

                                    // --- FEEDBACK LOOP ---
                                    // AI'ya komutun sonucunu bildir
                                    aiService.addToHistory(message.guild.id, 'system',
                                        `[SİSTEM BİLGİSİ] Komut Çıktısı (${cmd.command}): ${commandResult.message}`
                                    );

                                    // Regex ile temizle: Opsiyonel ** ve boşlukları da al
                                    const escapedMatch = cmd.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const cleanRegex = new RegExp(`\\**\\s*${escapedMatch}\\s*\\**`, 'g');
                                    response = response.replace(cleanRegex, '').trim();
                                    if (commandResult && commandResult.message) {
                                        response = `${commandResult.message}\n\n${response}`;
                                    }
                                }
                                // ONERI tipi zaten metin içinde sunulur
                            }
                        }
                    }

                    if (!response || response.trim().length === 0) return;

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
                    try { errorHandler.log('AIMessageError', error); } catch (e) { }
                } finally {
                    // 🔓 LOCK RELEASE: İşlem bitti, lock'u kaldır
                    processingMessages.delete(message.id);
                }
                return; // AI yanıtladıysa diğer kontrollere gerek yok, return at
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 🛡️ YAPAY ZEKA MODERASYONu (TÜM MESAJLAR İÇİN)
        // ═══════════════════════════════════════════════════════════
        if (db.fetch(`kufurengel_${guildId}`)) {
            const hasPermission = message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!hasPermission) {
                const contentLower = content.toLowerCase();
                const detectedWords = bannedWords.filter(word => contentLower.includes(word.toLowerCase()));

                if (detectedWords.length > 0) {
                    console.log(`[AI MODERATION] ⚠️ Küfür tespit edildi: ${detectedWords.join(', ')} (Kullanıcı: ${message.author.username})`);

                    // Mesajı sil
                    await message.delete().catch(() => { });

                    // Uyarı sayısını artır
                    const warningKey = `warning_${guildId}_${message.author.id}`;
                    const currentWarnings = db.get(warningKey) || 0;
                    db.set(warningKey, currentWarnings + 1);

                    // AI tarzında çeşitli uyarı mesajları
                    const warningMessages = [
                        `🛡️ Hey ${message.author}, bu tarz kelimeleri kullanmamayı tercih ederim. Lütfen daha nazik olalım!`,
                        `⚠️ ${message.author}, bu ifade pek hoş değil. Birbirimize saygılı olalım!`,
                        `🤖 Hmm ${message.author}... Bu kelimeyi duymamış gibi davranayım mı? Lütfen daha kibar olalım.`,
                        `💙 ${message.author}, ben de bazen sinirleniyorum ama kelimelere dikkat edelim!`,
                        `🚫 ${message.author}, bu kelime benim hoşuma gitmedi. Daha güzel konuşabilir miyiz?`
                    ];

                    const randomWarning = warningMessages[Math.floor(Math.random() * warningMessages.length)];

                    message.channel.send(`${randomWarning}\n*(Toplam uyarı: ${currentWarnings + 1})*`).then(msg => {
                        setTimeout(() => msg.delete().catch(() => { }), 5000);
                    }).catch(() => { });

                    return;
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 🚫 REKLAM ENGEL
        // ═══════════════════════════════════════════════════════════
        if (db.fetch(`reklamengel_${guildId}`)) {
            const hasPermission = message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!hasPermission) {
                for (const link of bannedLinks) {
                    if (content.includes(link)) {
                        message.delete().catch(() => { });
                        message.channel.send(`${message.author}, bu sunucuda reklam atamazsın!`).then(msg => {
                            setTimeout(() => msg.delete().catch(() => { }), 2000);
                        }).catch(() => { });
                        return;
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 💤 AFK SİSTEMİ
        // ═══════════════════════════════════════════════════════════
        const afkReason = db.get(`afk_${message.author.id}`);
        if (afkReason) {
            db.delete(`afk_${message.author.id}`);
            db.delete(`afkDate_${message.author.id}`);
            message.reply({
                content: `👋 Tekrar hoş geldin! AFK durumun kaldırıldı.`,
                allowedMentions: { repliedUser: false }
            }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            }).catch(() => { });
        }

        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                const afk = db.get(`afk_${user.id}`);
                if (afk) {
                    const afkDate = db.get(`afkDate_${user.id}`);
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
            const moduleSetting = db.fetch(`module_${guildId}_seviye-sistemi`);
            const isLevelActive = moduleSetting !== false; // undefined = açık (varsayılan)
            if (isLevelActive) {
                const result = levelSystem.addXP(guildId, message.author.id, message.author.username);
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
            const gameData = db.fetch(`sayisayma_${message.channel.id}`);
            if (gameData && typeof gameData === 'object' && gameData.count != null) {
                const currentCount = gameData.count;
                const lastUser = gameData.lastUser;

                if (message.author.id === lastUser) {
                    await message.reply('Lütfen başka bir kullanıcının sayı girmesini bekleyin.').catch(() => { });
                    return;
                }

                const number = parseInt(message.content, 10);
                if (isNaN(number) || number !== currentCount + 1) {
                    const alreadyWarned = db.fetch(`warned_${message.channel.id}_${message.author.id}`);
                    if (!alreadyWarned) {
                        await message.react('❌').catch(() => { });
                        const warningMsg = await message.reply('Lütfen sıradaki sayıyı girin.').catch(() => null);
                        db.set(`warned_${message.channel.id}_${message.author.id}`, true);
                        if (warningMsg && warningMsg.deletable) setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
                    }
                } else {
                    await message.react('✅').catch(() => { });
                    db.set(`sayisayma_${message.channel.id}`, { count: currentCount + 1, lastUser: message.author.id });
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
