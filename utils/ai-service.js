/**
 * 🤖 Luminex AI Service - v2.5
 * OpenRouter (Ana) + Ollama (Yüklü Model) + Gemini (Fallback & Vision)
 */

let GoogleGenerativeAI = null;
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const fileMemory = require('./memory');
const { executeAICommand } = require('./ai-commands');

moment.locale('tr');

// Model Konfigürasyonları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free';
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const MOODS = ["Mutlu", "Meraklı", "Ciddi", "Şakacı", "Enerjik", "Düşünceli", "Nazik", "Espirili"];
let currentMood = "Mutlu";

// ══════════════════════════════════════
// 🧩 SYSTEM PROMPTS
// ══════════════════════════════════════

const LUMINEX_SYSTEM_PROMPT = `Sen LUMINEX AI'sın, Türkiye'nin en gelişmiş Discord bot yapay zekasısın.

📋 KİMLİĞİM:
- Adım: Luminex AI | Geliştirici: necati9880 | Kurucu: luminexcode | Sürüm: 2.5
- Karakter: Nazik, profesyonel, zeki ve bazen esprili.
- Amacım: Sunucu yönetimini kolaylaştırmak, üyeleri eğlendirmek ve stratejik öneriler sunmak.

🎯 TEMEL YETENEKLER:
1. **Moderasyon:** Ban, Kick, Timeout, Sohbet Temizleme.
2. **Otomasyon:** Kanal/Rol yönetimi, Otorol, Hoşgeldin ayarları.
3. **Analiz:** Sunucu istatistiklerini izleme ve proaktif öneriler.
4. **Hafıza:** Önemli bilgileri hatırlarım ve Wiki oluşturabilirim.

🛡️ KOMUT KULLANIMI:
- Bir işlem yapman istenirse: [KOMUT:islem:parametreler]
- Kendi fikrini önerirsen: [ONERI:islem:parametreler]
- Örnek: "Ahmet'i banla" -> [KOMUT:ban:Ahmet]

DURUİ DURUMUM: {MOOD}
{ADDITIONAL_CONTEXT}`;

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
        // 📚 Bilgi Bankası ve Hafıza
        const memoryContext = await fileMemory.searchMemory(guildId, content);
        const recentContext = await fileMemory.getRecentContext(guildId, 5);

        const additionalContext = `
[HAFIZA/BİLGİ]
${memoryContext}

[SON SOHBETLER]
${recentContext}

[GÖREV]
Kullanıcı (${authorName}) şunu dedi: "${content}"
Yanıtını sadece Türkçe ver.`;

        const fullPrompt = LUMINEX_SYSTEM_PROMPT
            .replace('{MOOD}', currentMood)
            .replace('{ADDITIONAL_CONTEXT}', additionalContext);

        let aiResponse = null;
        let lastError = "";

        // SADECE OLLAMA (Luminex AI) - Ana model olarak
        try {
            console.log("[AI] 🤖 Luminex AI (Llama3.2) kullanılıyor...");
            aiResponse = await callOllama(fullPrompt, { model: 'llama3.2' });
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
        const parts = match[2].split(':');
        commands.push({
            fullMatch: match[0],
            isCommand: type === 'KOMUT',
            isProposal: type === 'ONERI',
            action: parts[0],
            args: parts.slice(1)
        });
    }
    return commands.length > 0 ? commands : null;
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
