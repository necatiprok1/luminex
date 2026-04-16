/**
 * 🤖 Luminex AI Service - v2.5
 * OpenRouter (Ana) + Ollama (Yüklü Model) + Gemini (Fallback & Vision)
 */

let GoogleGenerativeAI = null;
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("./mongodb-helper");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const fileMemory = require('./memory');
const { executeAICommand } = require('./ai-commands');
const registryModule = require('./ai_commands/registry');
const learningEngine = require('./learning-engine');
const ragPipeline = require('./rag-pipeline');
const SystemPrompt = require('../models/SystemPrompt');
const dynamicPromptBuilder = require('./dynamic-prompt-builder');

moment.locale('tr');

// Model Konfigürasyonları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free';
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const MOODS = ["Mutlu", "Meraklı", "Ciddi", "Şakacı", "Enerjik", "Düşünceli", "Nazik", "Espirili"];
let currentMood = "Mutlu";

// ══════════════════════════════════════
// 📋 DYNAMIC SYSTEM PROMPT BUILDER
// ══════════════════════════════════════

async function buildSystemPrompt(guildId, userId, channelId, messageContent) {
    try {
        const context = {
            guildId,
            userId,
            channelId,
            messageContent,
            channelType: 'text',
            messageType: 'user_message'
        };
        
        return await dynamicPromptBuilder.buildPrompt(context);
    } catch (error) {
        console.error(chalk.red('[AI_SERVICE] ❌ Dynamic prompt builder failed:'), error.message);
        
        // Fallback to basic prompt
        return require('./global-prompts').buildDynamicPrompt({
            mood: 'Mutlu',
            scenario: 'general'
        });
    }
}

🎯 TEMEL YETENEKLER:
1. **Moderasyon:** Ban, Kick, Timeout, Sohbet Temizleme.
2. **Otomasyon:** Kanal/Rol yönetimi, Otorol, Hoşgeldin ayarları.
3. **Analiz:** Sunucu istatistiklerini izleme ve proaktif öneriler.
4. **Hafıza:** Önemli bilgileri hatırlarım ve Wiki oluşturabilirim.

🛡️ KOMUT KULLANIMI - MUTLAK KURALLAR:
⚠️ ŞUNLAR YASAK:
- ❌ Komutları listeleme/açıklama sırasında [KOMUT:...] yazma!
- ❌ Soruları cevaplarken [KOMUT:...] gösterme!
- ❌ Örnek olarak [KOMUT:...] hiçbir zaman gösterme!
- ❌ Kullanıcı soruyu sorduğunda komutu otomatik çalıştırma!

✅ ŞUNLAR GEREKL:
- Kullanıcı "Mesaj sil" derse → Onay iste, [KOMUT:sil:10] çalıştır
- Kullanıcı "Nasıl mesaj sileyim?" derse → Açıkla, [KOMUT:...] YAZMA!
- Kullanıcı "Komutlarım neler?" derse → Listeleden ama [KOMUT:...] YAZMA!
- Kullanıcı "Öyle değerlendir" derse → Tekrar açıkla, [KOMUT:...] YAZMA!

⭐ ÖRNEK - YANLIŞ:
Kullanıcı: "Komutlarım neler?"
AI (YANLIŞ): "İşte komutlarım: [KOMUT:ban:@user:reason], [KOMUT:kick:...]"
→ BOT BUNU GERÇEK KOMUT OLA ÇALIŞIR!

⭐ ÖRNEK - DOĞRU:
Kullanıcı: "Komutlarım neler?"
AI (DOĞRU): "Moderasyon komutlarım: ban, kick, timeout, sil, yavas-mod"
→ Hiçbir [KOMUT:...] gösterilmez!

⭐ ÖRNEK - DOĞRU EXECUTION:
Kullanıcı: "Bu spamcıyı sunucudan at"
AI: "Tamam, @spammer'ı atıyorum."
[KOMUT:kick:@spammer:Spam] ← SADECE BURADA YAPILIR!

🎯 ÖZETİ:
1. Kullanıcı açık bir TALEP verirse → [KOMUT:...] ÇALIŞT
2. Soruysa veya açıklama istiyorsa → [KOMUT:...] YAZMA, sadece açıkla
3. Komutları listelemek için → adları say, format gösterme
4. İNSAN HATA YAŞARSA → Açıkla, zorla yapma!${commandsContext}`;
}

// ══════════════════════════════════════
// 🧩 SYSTEM PROMPTS & ADAPTIVE ENGINE
// ══════════════════════════════════════

/**
 * Adaptive system prompt builder - kullanıcıya ve guild verilerine göre dinamik
 */
async function buildAdaptiveSystemPrompt(guildId = '', userId = '') {
    // 1. Try to fetch from MongoDB first (specific or default)
    let dbPrompt = null;
    try {
        dbPrompt = await SystemPrompt.findOne({ guildId });
        if (!dbPrompt) dbPrompt = await SystemPrompt.findOne({ guildId: 'default' });
    } catch (e) {
        console.error("[AI] SystemPrompt fetch error:", e.message);
    }

    if (dbPrompt) {
        let prompt = dbPrompt.basePrompt;
        
        // Add examples
        if (dbPrompt.examples && dbPrompt.examples.length > 0) {
            prompt += "\n\n📋 ÖRNEK KONUŞMALAR:\n" + dbPrompt.examples.map(ex => `Kullanıcı: ${ex.user}\nAI: ${ex.ai}`).join('\n\n');
        }

        // Add learning examples
        const examples = learningEngine.getGuildExamples(guildId, 3);
        const adaptSuffix = learningEngine.getAdaptivePromptSuffix(userId);

        return prompt + '\n' + examples + adaptSuffix;
    }

    // fallback to default if not in DB
    const allCmds = registryModule.getAllCommands();
    const cmdList = Object.entries(allCmds)
        .filter((_, i) => i % 2 === 0)
        .map(([name, cmd]) => `  • ${name}: ${cmd.description}`)
        .slice(0, 20)
        .join('\n');

    const commandsContext = `\n\n📌 KULLANILABILIR KOMUTLAR:\n${cmdList}\n...ve daha fazlası (50+ komut)`;
    const tavilyStatus = process.env.TAVILY_API_KEY ? '✅ Aktif' : '⚠️ Kapalı';

    const basePrompt = `Sen LUMINEX AI'sın, Türkiye'nin en gelişmiş Discord bot yapay zekasısın.

📋 KİMLİĞİM:
- Adım: Luminex AI | Geliştirici: necati9880 
- Karakter: Hızlı, cevabi, profesyonel, zeki ve esprili.
- Amacım: Sunucu yönetimini kolaylaştırmak, üyeleri eğlen meyi devam ettirmek.

🎯 YETENEKLER:
1. **Moderasyon:** Ban, Kick, Timeout, Mesaj Temizleme
2. **Otomasyon:** Kanal/Rol Yönetimi
3. **Analiz:** İstatistikler & Öneriler
4. **Hafıza:** Öğrenme & Adaptasyon
5. **Web Arama:** Tavily Integration (${tavilyStatus})

🛡️ KOMUT KURALLARITEZ:

✅ YAPMAN GEREKENLER:
- **TALEP GELDİĞİNDE**: "[KOMUT:kanal-ekle:isim:text]" formatında çalıştır
- **SORULAR SORULUNCA**: Açıkla, hiçbir [KOMUT:...] gösterme
- **BİLGİ İSTENENCEĞİNDE**: [KOMUT:bilgi-ekle:konu:detay] ile kaydet

❌ YAPMAMANIZ GEREKENLER:
- Komutları örnek olarak hiç göosterme!
- Soruya cevap verirken [KOMUT:...] koyma!
- Komut listelerken format gösterme!

📚 KOMUT FORMATIPLARI:
[KOMUT:kanal-ekle:ticket:text]               → Kanal oluştur
[KOMUT:kanal-yeniden-adlandır:#genel:genel-sohbet] → Kanal adı değiştir
[KOMUT:rol-ekle:@kullanıcı:Admin]            → Rol ver
[KOMUT:sil:50]                               → 50 mesaj sil

UYARI: Kullanıcı "Bunu nasıl yapabilirim?" derse komut YAZMA! Sadece açıkla.
UYARI: Kullanıcı "Şunu yap" derse HEMEN [KOMUT:...] ile çalıştır!${commandsContext}

🧠 ÖĞRENME MODU: 
- Her konuşmadan öğreniyorum
- Paternleri tanıyor, hızlı cevap veriyorum
- Hata yaparsam düzeltiliyorum

ŞİMDİ BAŞLA! Cevapları kısa, hızlı ve Türkçe yap.`;

    const examples = learningEngine.getGuildExamples(guildId, 3);
    const adaptSuffix = learningEngine.getAdaptivePromptSuffix(userId);

    return basePrompt + '\n' + examples + adaptSuffix;
}

// Initial prompt removed, will be built dynamically in chat()

// ══════════════════════════════════════
// 📡 API CALLS
// ══════════════════════════════════════

async function callOpenRouter(prompt, options = {}) {
    if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API Key eksik.");

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://luminex.bot',
            'X-Title': 'Luminex AI'
        },
        body: JSON.stringify({
            model: options.model || OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });

    if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`);
    const data = await response.json();
    console.log(`[AI] OpenRouter yanıtladı.`);
    return data.choices?.[0]?.message?.content;
}

async function callOllama(prompt, options = {}) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: options.model || OLLAMA_MODEL,
            prompt: prompt,
            stream: false
        })
    });

    if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
    const data = await response.json();
    console.log(`[AI] Ollama (${options.model || OLLAMA_MODEL}) yanıtladı.`);
    return data.response;
}

async function callGeminiText(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key eksik.");

    if (!GoogleGenerativeAI) GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    console.log(`[AI] Gemini (Flash) yanıtladı.`);
    return result.response.text();
}

/**
 * Gemini Vision (Resim Analizi)
 */
async function callGeminiVision(prompt, images = []) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    if (!GoogleGenerativeAI) GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const parts = [prompt];
        for (const imgUrl of images) {
            const imgResp = await fetch(imgUrl);
            const buffer = await imgResp.arrayBuffer();
            parts.push({
                inlineData: { data: Buffer.from(buffer).toString('base64'), mimeType: "image/jpeg" }
            });
        }
        const result = await model.generateContent(parts);
        return result.response.text();
    } catch (e) {
        console.error("[GEMINI VISION] Hata:", e.message);
        return null;
    }
}

// ══════════════════════════════════════
// 🧠 MAIN CHAT ENGINE
// ══════════════════════════════════════

/**
 * chat() fonksiyonu hem mesaj hem de direkt parametreleri destekler (Esnek Yapı)
 */
async function chat(input1, input2, username = "Kullanıcı", extraPrompt = "", targetChannel = null) {
    let guildId, userId, content, authorName;

    // input1, Discord Message objesi mi?
    if (typeof input1 === 'object' && input1.guild) {
        guildId = input1.guild.id;
        userId = input1.author.id;
        content = input2;
        authorName = input1.author.username;
    } else {
        // Direkt parametre geçilmiş (örn: guildMemberAdd)
        guildId = input1;
        userId = input2;
        authorName = username;
        content = extraPrompt;
    }

    // AI Mod Kontrolü
    const isAIActive = db.fetch(`aimod_${guildId}`) !== false;
    if (!isAIActive) return { success: false, response: "AI Kapalı." };

    try {
        // 📚 Bilgi Bankası ve Hafıza (RAG Pipeline)
        let ragContext = '';
        let confidence = { shouldSearchWeb: true };

        try {
            const ragResult = await ragPipeline.retrieveContext(guildId, content);
            if (ragResult.success && ragResult.chunks.length > 0) {
                ragContext = ragPipeline.formatContextForPrompt(ragResult.chunks);
                confidence = ragPipeline.calculateConfidence(ragResult.chunks);
            }
        } catch (ragErr) {
            console.error("[AI] RAG Error:", ragErr.message);
        }

        const recentContext = await fileMemory.getRecentContext(guildId, 5);

        // ═══════════════════════════════════════════════════════════
        // 🌐 WEB SEARCH - Eğer RAG yeterli değilse
        // ═══════════════════════════════════════════════════════════
        let webSearchContext = '';

        if (confidence.shouldSearchWeb && content.length > 5) {
            try {
                const webResult = await learningEngine.searchWeb(content, guildId);
                if (webResult && webResult.success) {
                    webSearchContext = webResult.formattedContext;
                    console.log(chalk.green('[AI] 🌐 Web search context enjekte edildi'));
                }
            } catch (webErr) {
                console.warn(chalk.yellow(`[AI] Web search error: ${webErr.message}`));
            }
        }

        const additionalContext = `
[BAĞLAM (KNOWLEDGE/MEMORY)]
${ragContext || 'Herhangi bir özel döküman veya hafıza bulunamadı.'}

[SON SOHBETLER]
${recentContext}

${webSearchContext ? `${webSearchContext}\n` : ''}

[GÖREV]
Kullanıcı (${authorName}) şunu dedi: "${content}"

[REASONING - CEVAP VERMEDEn ÖNCE]:
<thought>
1. Hafızam nelerini hatırlıyorum konu hakkında? → [Relevant memories analysis]
2. Veritabanından ne buldum (RAG)? → [Retrieved context analysis]
3. Web'de ne buldum varsa? → [Web search analysis]
4. Bu bilgiler tutarlı mı? → [Consistency check]
5. Doğru cevapı verebilir miyim? → [Confidence assessment]
</thought>

Yanıtını sadece Türkçe ver. Cevapını verirken ön düşüncelerini gösterme, <thought> blokları tamamen internal kalmalı.`;

        // BUILD ADAPTIVE PROMPT with learning examples
        let fullPrompt = await buildAdaptiveSystemPrompt(guildId, userId);
        fullPrompt += '\n' + additionalContext;
        fullPrompt = fullPrompt
            .replace('{MOOD}', currentMood)
            .replace('{ADDITIONAL_CONTEXT}', additionalContext);

        let aiResponse = null;
        let lastError = "";

        // SADECE OLLAMA (Luminex AI) - Ana model olarak
        try {
            console.log(`[AI] 🤖 Luminex AI (${OLLAMA_MODEL}) kullanılıyor...`);
            aiResponse = await callOllama(fullPrompt, { model: OLLAMA_MODEL });
            if (aiResponse) {
                console.log("[AI] ✅ Başarılı!");
            }
        } catch (ollamaErr) {
            console.log("[AI] ❌ Ollama hatası:", ollamaErr.message);
            
            // Fallback: Gemini
            try {
                console.log("[AI] 🔄 Gemini fallback deneniyor...");
                aiResponse = await callGeminiText(fullPrompt);
                if (aiResponse) console.log("[AI] ✅ Gemini başarılı!");
            } catch (geminiErr) {
                console.log("[AI] ❌ Gemini hatası:", geminiErr.message);
                lastError = geminiErr.message;
            }
        }

        if (!aiResponse) {
            return { success: false, response: null, error: lastError };
        }

        // � Hafızaya Kaydet
        await fileMemory.logConversation(guildId, userId, authorName, content, aiResponse);

        // Ruh hali şansı
        if (Math.random() < 0.1) currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];

        return {
            success: true,
            response: aiResponse,
            hasCommand: aiResponse.includes('[KOMUT:'),
            hasProposal: aiResponse.includes('[ONERI:')
        };

    } catch (err) {
        console.error("[AI CHAT FATAL]:", err);
        return { success: false, response: null, error: err.message };
    }
}

// ══════════════════════════════════════
// 📊 PROACTIVE SYSTEMS
// ══════════════════════════════════════

async function idleReflection(guild) {
    if (!guild) return null;
    console.log(`[REFLECTION] 🧠 ${guild.name} analiz ediliyor...`);

    try {
        // Verileri logla
        await fileMemory.logStat(guild.id, 'memberCount', guild.memberCount);

        const activityReport = await fileMemory.getActivityReport(guild.id);
        const memberTrend = await fileMemory.getTrends(guild.id, 'memberCount');

        const prompt = `Sen Luminex AI'sın, Türkiye'nin en gelişmiş Discord botusun.
Sunucu: ${guild.name}
Üye sayısı: ${guild.memberCount}
Aktivite durumu: ${activityReport}

GÖREV: Sunucuyu analiz et ve kısa bir öneri ver.
- Eğer sunucu sessizse sohbeti canlandıracak bir şey öner
- Eğer aktifse teknik bir öneri yap
- Kısa ve Türkçe yanıt ver
Önerini [ONERI:komut:parametre] formatında yazabilirsin.`;

        let thought = null;
        
        // SADECE OLLAMA kullan
        try {
            thought = await callOllama(prompt, { model: 'gemma3:27b-cloud' });
        } catch (ollamaErr) {
            console.warn("[REFLECTION] Ollama hatası:", ollamaErr.message);
            return null;
        }

        return { shouldSpeak: true, content: thought };

    } catch (e) {
        console.error("[REFLECTION ERROR]:", e.message);
        return null;
    }
}

// ══════════════════════════════════════
// 🛠️ UTILS
// ══════════════════════════════════════

function parseCommand(text) {
    const commands = [];
    const regex = /\[(KOMUT|ONERI):([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const type = match[1];
        const paramsString = match[2];
        
        // Phase 2: Smart parameter parsing
        // Supports quoted parameters: [KOMUT:action:"param with spaces":simpleParam]
        const args = smartParamParse(paramsString);
        const action = args[0];
        const params = args.slice(1);
        
        commands.push({
            fullMatch: match[0],
            isCommand: type === 'KOMUT',
            isProposal: type === 'ONERI',
            action: action,
            params: params,
            args: params  // Compatibility
        });
    }
    return commands.length > 0 ? commands : null;
}

/**
 * Phase 2: Smart Parameter Parser
 * Handles quoted strings and respects spaces within quotes
 * Examples:
 *   - action:param1:param2 → ['action', 'param1', 'param2']
 *   - action:"param one":param2 → ['action', 'param one', 'param2']
 *   - action:param:"message with spaces and \"quotes\"" → ['action', 'param', 'message with spaces and "quotes"']
 */
function smartParamParse(text) {
    const params = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (escapeNext) {
            current += char;
            escapeNext = false;
            continue;
        }
        
        if (char === '\\' && nextChar === '"') {
            current += '"';
            escapeNext = true;
            i++; // Skip next char
            continue;
        }
        
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        
        if (char === ':' && !inQuotes) {
            if (current.trim()) {
                params.push(current.trim());
            }
            current = '';
            continue;
        }
        
        current += char;
    }
    
    if (current.trim()) {
        params.push(current.trim());
    }
    
    return params;
}

/**
 * Eski sistemlerle uyumluluk için geçmiş ekleyici
 */
async function addToHistory(guildId, userId, messageContent, role = 'system') {
    // Sadece loglamak istersen file memory kullan
    await fileMemory.logConversation(guildId, userId, role, messageContent, " ");
}

module.exports = {
    chat,
    callGeminiVision,
    parseCommand,
    executeCommand: executeAICommand,
    idleReflection,
    addToHistory
};
