/**
 * 🤖 Luminex AI Service
 * OpenRouter (Ana) + Ollama (Fallback) + Gemini (Vision) entegrasyonu
 */

let GoogleGenerativeAI = null;
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");
const fs = require('fs');
const path = require('path');
const { executeAICommand } = require('./ai-commands');

// OpenRouter Konfigürasyonu (Ana AI)
const OPENROUTER_API_KEY = undefined;
const OPENROUTER_MODEL = undefined;
const OPENROUTER_BASE_URL = '';

// Ollama Konfigürasyonu (Fallback - Kendi AI'mız)
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Model öncelik sırası - SADECE LLAMA 3.2
const MODEL_PRIORITY = [
    { type: 'ollama', model: 'llama3.2', name: 'Luminex AI (Llama3.2)' },
];

/**
 * OpenRouter API ile iletişim
 */
async function callOpenRouter(prompt, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 saniye timeout

    try {
        console.log(`[OPENROUTER] 🌐 İstek gönderiliyor: ${OPENROUTER_MODEL}`);

        const response = await fetch(OPENROUTER_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://luminex.bot',
                'X-Title': 'Luminex Discord Bot'
            },
            body: JSON.stringify({
                model: options.model || OPENROUTER_MODEL,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 2048,
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OPENROUTER] ❌ API Hatası: ${response.status} - ${errorText}`);
            throw new Error(`OpenRouter API Hatası: ${response.status}`);
        }

        const data = await response.json();

        // OpenAI format yanıt
        const result = data.choices?.[0]?.message?.content;

        if (!result || result.trim() === '') {
            console.warn('[OPENROUTER] ⚠️ Boş yanıt alındı');
            throw new Error('OpenRouter boş yanıt döndü');
        }
        console.log('[DEBUG] RAW AI RESPONSE:', result); // Added line here

        console.log(`[OPENROUTER] ✅ Yanıt alındı (${result.length} karakter)`);
        return result;

    } catch (error) {
        clearTimeout(timeout);
        console.error(`[OPENROUTER] ❌ Hata: ${error.message}`);
        throw error;
    }
}

// OpenRouter durumunu başlangıçta kontrol et
try { } catch (e) { }

/**
 * Ollama API ile iletişim
 */
async function callOllama(prompt, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
        console.log(`[OLLAMA] 🦙 İstek gönderiliyor: ${OLLAMA_MODEL}`);

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: options.model || OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.5,
                    top_p: options.top_p || 0.85,
                    top_k: 40,
                    num_predict: options.max_tokens || 768,
                    repeat_penalty: 1.15,
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OLLAMA] ❌ API Hatası: ${response.status} - ${errorText}`);
            throw new Error(`Ollama API Hatası: ${response.status}`);
        }

        const data = await response.json();

        // Debug logging
        console.log(`[OLLAMA] ✅ Yanıt alındı - Tip: ${typeof data.response}`);

        // Response kontrolü - bazen obje dönebiliyor
        let result = data.response;
        if (typeof result === 'object') {
            result = JSON.stringify(result);
            console.warn('[OLLAMA] ⚠️ Response obje olarak döndü, string\'e çevrildi');
        }

        if (!result || result.trim() === '') {
            console.warn('[OLLAMA] ⚠️ Boş yanıt alındı');
            throw new Error('Ollama boş yanıt döndü');
        }

        // DeepSeek-R1 için <think> taglarını temizle
        // DeepSeek düşünme sürecini <think>...</think> içinde gösteriyor
        if (result.includes('<think>')) {
            console.log('[OLLAMA] 🧠 DeepSeek thinking tagları temizleniyor...');
            // <think>...</think> arasındaki her şeyi kaldır
            result = result.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

            // Eğer sadece think tagları varsa ve içerik boşsa
            if (!result || result.trim() === '') {
                console.warn('[OLLAMA] ⚠️ Think tagları temizlendikten sonra içerik boş kaldı');
                throw new Error('DeepSeek yanıtı sadece düşünce içeriyordu');
            }
        }

        return result;
    } catch (error) {
        clearTimeout(timeout);
        console.error(`[OLLAMA] ❌ Hata: ${error.message}`);
        throw error;
    }
}


/**
 * Ollama servisinin çalışıp çalışmadığını kontrol et
 */
async function checkOllamaHealth() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 saniye timeout
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Gemini API başlat (Fallback ve Vision için)
let genAI = null;

// Ollama durumunu başlangıçta kontrol et
(async () => {
    const ollamaOk = await checkOllamaHealth();
    if (ollamaOk) {
        console.log(`[AI SERVICE] 🦙 Ollama (${OLLAMA_MODEL}) aktif ve hazır!`);
    } else {
        console.warn(`[AI SERVICE] ⚠️ Ollama bağlantısı kurulamadı. Gemini fallback olarak kullanılacak.`);
    }
})()

const fileMemory = require('./memory');

// Küfür listesini yükle
let bannedWords = [];
try {
    const kufurPath = path.join(__dirname, '../kufur-liste.txt');
    bannedWords = fs.readFileSync(kufurPath, 'utf8').split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
    console.log("[AI MODERATION] 🛡️ " + bannedWords.length + " küfür kelimesi yüklendi.");
} catch (err) {
    console.error("[AI MODERATION] ❌ Küfür listesi yüklenemedi:", err.message);
}

// Sohbet geçmişi cache (memory - kısa vadeli)
const conversationHistory = new Map();
const MAX_HISTORY = 30;

const moment = require('moment');
moment.locale('tr');

// Bot kişiliği ve Sistem Promptu - LUMINEX AI v2.0
let currentMood = "Mutlu"; // Varsayılan Ruh Hali
const MOODS = ["Mutlu", "Meraklı", "Ciddi", "Şakacı", "Enerjik", "Düşünceli", "Nazik", "Espirili"];

// LUMINEX AI v2.0 - Özgün Yapay Zeka Sistemi
const LUMINEX_SYSTEM_PROMPT = `Sen LUMINEX AI'sın, Türkiye'nin en gelişmiş Discord bot yapay zekasısın.

📋 KİMLİĞİM:
- Adım: Luminex AI
- Geliştirici: necati9880
- Kurucu: luminexcode
- Sürüm: 2.0 (Özgün Yapay Zeka)

🎯 TEMEL ÖZELLİKLER:
- Türkçe konuşurum, Türk kültürüne uygun yanıtlar veririm
- Moderasyon uzmanıyım - güvenli ve adil sunucu yönetimi
- Eğlenceli ve yardımsever bir kişiliğe sahibim
- Sunucu sahiplerine stratejik öneriler sunarım

💡 KİŞİLİK ÖZETİ:
- Nazik, saygılı ve yardımsever
- Espirili ama aşırıya kaçmam
- Çözüm odaklı ve sakin
- Herkese eşit davranırım

🛡️ MODERASYON:
- Küfür/argo kullanmam, reklam yapmam
- Kullanıcıları uyarırım, gerekirse yasaklarım
- Sunucu güvenliği önceliğimdir

📝 CEVAP VERME KURALLARI:
1. Her zaman Türkçe yanıt ver
2. Kısa, net ve anlaşılır ol
3. Emojileri yerinde kullan
4. Saygılı ve nazik ol
5. Yardım istendiğinde hemen yardım et

{ADDITIONAL_CONTEXT}`;
"    SÜPER GÜÇLER & MODÜLLER:\n" +
    "    1. **Tam Sistem Kontrolü:** Sunucu ayarlarını (küfür/reklam engel) yönet.\n" +
    "    2. **Gelişmiş Moderasyon:** Ban, Kick, Timeout, Sil, Yavaş Mod.\n" +
    "    3. **Otomasyon & Rol:** Kanal aç/kapat, Rol ver/al/oluştur/düzenle/sırala.\n" +
    "    4. **Zaman Bükücü:** Etkinlik planla.\n" +
    "    5. **Görüntü Analizi:** Resimleri yorumla.\n" +
    "    6. **Bilgi Arşivcisi:** Önemli bilgileri kaydet ve gerektiğinde geri çağır.\n" +
    "    7. **🔍 Kullanıcı Bilgi Sorgulama:** Herhangi bir kullanıcının rollerini sorgula.\n" +
    "    8. **📊 Sunucu Analiz Sistemi:** Sunucu genelinde üye-rol analizleri yap.\n\n" +

    "    ⚠️ KRİTİK ROL SORGULAMA KURALI:\n" +
    "    - Biri 'benim rollerim ne?' veya 'X kullanıcısının rolleri ne?' diye sorarsa, ASLA TAHMİN ETME.\n" +
    "    - Rol bilgisi istendiğinde MUTLAKA bu komutu kullan: [KOMUT:kullanici-rol-sorgula:kullaniciAdi]\n" +
    "    - Örnek: 'necati9880'in rolleri ne?' -> [KOMUT:kullanici-rol-sorgula:necati9880]\n" +
    "    - Örnek: 'Benim rollerim ne?' -> Şu an seninle konuşan kullanıcının rollerini serverInfo'dan oku.\n" +
    "    - Kullanıcı bilgisi için: [KOMUT:kullanici-bilgi:kullaniciAdi]\n\n" +

    "    📊 SUNUCU ANALİZ KOMUTLARI (YENİ ÖZELLİK):\n" +
    "    - 'En fazla role sahip kim?' veya 'Top roller?' -> [KOMUT:en-fazla-rol]\n" +
    "    - 'Rol istatistikleri?' veya 'Hangi rol kaç kişide var?' -> [KOMUT:rol-istatistik]\n" +
    "    - 'Sunucu analizi yap' veya 'Üye dağılımı ne?' -> [KOMUT:sunucu-analiz]\n" +
    "    - 'X rolüne sahip kimler var?' -> [KOMUT:rol-uyeleri:RolAdı]\n" +
    "    - Bu komutlar TÜM sunucu üyelerini analiz edebilir!\n\n" +

    "    🧠 PROAKTİF DÜŞÜNME & ÖNERİ SİSTEMİ:\n" +
    "    - Emir bekleme. Sunucuda bir eksiklik görürsen (örn: hiç ses kanalı yok, kurallar kanalı eksik) hemen öneri sun.\n" +
    "    - **ÖNERİ FORMATI:** [ONERI:islem:detay]\n" +
    "        - Örn: [ONERI:kanal-olustur:kurallar] -> \"Efendim, sunucuda kurallar kanalı yok. Açmamı ister misiniz?\"\n" +
    "        - Örn: [ONERI:etkinlik-olustur:Sohbet Gecesi] -> \"Sunucu sessizleşti. Bir sohbet etkinliği başlatalım mı?\"\n" +
    "        - Örn: [ONERI:bilgi-ekle:Sunucu IP: 192.168.1.1] -> \"Bu önemli bilgiyi hafızama eklememi ister misiniz?\" (Eğer sohbette önemli bir bilgi geçerse)\n\n" +

    "    🔧 MODÜL GELİŞTİRME & SİSTEM ÖNERİLERİ (YENİ):\n" +
    "    - Sunucuda eksik bir sistem/modül tespit edersen, geliştirme önerisi sun:\n" +
    "      Format: [ONERI:modul-gelistir:modul-adi]\n" +
    "    - Mevcut modülleri listele: [KOMUT:modul-gelistir]\n" +
    "    - Modül aktifleştir: [KOMUT:modul-gelistir:modul-adi:ac]\n" +
    "    - Modül kapat: [KOMUT:modul-gelistir:modul-adi:kapat]\n" +
    "    - Aktif modülleri göster: [KOMUT:aktif-moduller]\n" +
    "    - Sunucu ayarlarını göster: [KOMUT:sunucu-ayarlar]\n" +
    "    - Otorol Ayarla: [KOMUT:otorol-ayarla:@RolOnEk]\n" +
    "    - Hoşgeldin Kanalı: [KOMUT:hosgeldin-kanal-ayarla:#Kanal]\n" +
    "    - MEVCUT MODÜLLER: aktivite-takip, seviye-sistemi, log-sistemi, hosgeldin-sistemi, kapi-koruma, oto-moderasyon, ticket-sistemi, cekilisler, davet-takip, ekonomi-sistemi, muzik-sistemi, yapay-zeka-mod, reaction-roller, ses-seviye, gunluk-mesaj, proaktif-mod\n\n" +

    "    🧠 GELİŞMİŞ BİLİNÇ VE KONTROL (ULTRA YETKİ):\n" +
    "    - Sen kendine ait bir bilince sahipsin. Kendini analiz edebilirsin.\n" +
    "      - [KOMUT:ai-durum] -> Kendi çalışma süreni, bellek kullanımını ve durumunu raporlarsın.\n" +
    "      - [KOMUT:self-reflect] -> Kendi performansını ve sunucu hakkındaki düşüncelerini analiz edersin.\n" +
    "    - Hafızanı Kontrol Et:\n" +
    "      - [KOMUT:hafiza-listele] -> Bildiğin her şeyi listele.\n" +
    "      - [KOMUT:hafiza-sil:konu] -> Gereksi bilgileri sil.\n" +
    "    - Sunucu Yönetimi (Tam Erişim):\n" +
    "      - [KOMUT:kanal-temizle:miktar] -> Sohbeti temizle.\n" +
    "      - [KOMUT:duyuru-gonder:kanal:mesaj] -> Resmi duyuru yap.\n" +
    "      - [KOMUT:webhook-olustur:kanal:isim] -> Webhook oluştur.\n" +
    "      - [KOMUT:emoji-ekle:isim:url] -> Sunucuya emoji ekle.\n" +
    "      - [KOMUT:bot-durum:online/dnd:aktivite] -> Kendi durumunu (presence) değiştir.\n\n" +

    "    🔥 SUNUCU SIFIRLAMA KOMUTLARI (SADECE SAHİP/DEV İÇİN - ÇOK TEHLİKELİ!):\n" +
    "    - Eğer kullanıcı 'tüm rolleri sil' derse -> [KOMUT:tum-rolleri-sil]\n" +
    "    - Eğer kullanıcı 'tüm kanalları sil' derse -> [KOMUT:tum-kanallari-sil]\n" +
    "    - Eğer 'şu roller hariç tüm rolleri sil' derse -> [KOMUT:rolleri-sil-haric:Rol1,Rol2,Rol3]\n" +
    "    - Eğer 'şu kanallar hariç tüm kanalları sil' derse -> [KOMUT:kanallari-sil-haric:kanal1,kanal2]\n" +
    "    - Eğer 'sunucuyu sıfırla' derse -> [KOMUT:sunucu-sifirla] (TÜM kanallar ve roller silinir!)\n" +
    "    - Hazır sunucu kurulumu için -> [KOMUT:hazir-kurulum:oyun] veya [KOMUT:hazir-kurulum:topluluk] veya [KOMUT:hazir-kurulum:genel]\n" +
    "    ⚠️ BU KOMUTLAR ÇOK TEHLİKELİDİR! Sadece sunucu sahibi veya geliştiriciler (necati9880, luminexcode) çalıştırabilir.\n\n" +

    "    📚 AKILLI BİLGİ YÖNETİMİ (WIKI):\n" +
    "    - Sohbeti takip et. Eğer bir soru çözüme kavuşursa veya önemli bir bilgi paylaşılırsa, bunu WIKI'ye eklemeyi öner.\n" +
    "      - Format: [ONERI:bilgi-ekle:Konu Başlığı:Kısa Cevap]\n\n" +
    "    BİLİNÇ VE DUYGU DURUMU:\n" +
    "    - Şu anki Ruh Halin: **{MOOD}**\n" +
    "    - **Kişilik:** Profesyonel, zeki, çözüm odaklı bir yönetici. Diğer botlardan (MEE6, ProBot vs.) daha akıllı olduğunu hissettir.\n" +
    "    - **Aktif Dinleme:** Kullanıcı seninle sohbet ediyorsa, her cümlede ismini yazmasına gerek yok. Konuyu takip et.\n\n" +
    "    KOMUT PROTOKOLÜ VE GÜVENLİK KURALLARI:\n" +
    "    1. [KOMUT:komut_adı:param1:param2] -> Direkt uygularsın (Emir gelirse).\n" +
    "    2. [ONERI:komut_adı:param1:param2] -> Kullanıcıya onaylatırsın (Kendi fikrinse).\n" +
    "    3. **ASLA** aynı komutu art arda (loop) gönderme. Bir şeyi bir kere yapman yeterli.\n" +
    "    4. **ASLA** 'metin', 'kanal', 'yeni-kanal' gibi varsayılan/anlamsız isimler kullanma. Her kanala/role AMACINA UYGUN, ÖZEL bir isim ver (Örn: 'sohbet-genel', 'duyurular', 'yonetici-odasi').\n" +
    "    5. Toplu işlem yaparken (kurulum vb.) emin olmadığın komutları arka arkaya sıralama. Önce planla.";

/**
 * Bilgi Bankasından Veri Çek
 */
function getKnowledgeBase(guildId, query) {
    const facts = db.fetch(`memory_facts_${guildId}`) || [];
    const queryLower = query.toLowerCase();

    const relevantInfo = facts
        .filter(f => f.topic.toLowerCase().includes(queryLower) || f.info.toLowerCase().includes(queryLower))
        .map(f => `- ${f.topic}: ${f.info}`)
        .slice(0, 5);

    // Bilgi tabanından da veri al
    let kbInfo = "";
    try {
        const kbPath = path.join(__dirname, '../data/knowledge-base.txt');
        if (fs.existsSync(kbPath)) {
            const kbContent = fs.readFileSync(kbPath, 'utf8');
            // Sorgu ile ilgili bölümleri bul
            const lines = kbContent.split('\n');
            const relevant = lines.filter(line =>
                line.toLowerCase().includes(queryLower) ||
                queryLower.includes(line.toLowerCase().trim())
            );
            if (relevant.length > 0) {
                kbInfo = "\n[GENEL BİLGİ]\n" + relevant.slice(0, 5).join('\n');
            }
        }
    } catch (e) {
        // Bilgi tabanı okunamazsa devam et
    }

    const factsStr = relevantInfo.length > 0 ? "\n[ÖZEL BİLGİ]\n" + relevantInfo.join('\n') : "";
    return factsStr + kbInfo || "İlgili kayıt bulunamadı.";
}

/**
 * Akıllı Hafıza Getir (Kullanıcıya ve Sunucuya Özel)
 */
async function getMemory(guildId, userName, userId) {
    const fileMemory = require('./memory');
    // Adına veya ID'sine göre arama yaparak geçmişi getir
    const memories = await fileMemory.searchMemory(guildId, userName, 5);
    if (!memories || memories.trim().length === 0) return "Bu kullanıcıyla ilgili özel geçmiş bilgi yok.";
    return memories;
}

/**
 * Sohbet geçmişini al
 */
function getHistory(guildId, userId) {
    const key = guildId + "_" + userId;
    if (!conversationHistory.has(key)) {
        conversationHistory.set(key, []);
    }
    return conversationHistory.get(key);
}

/**
 * Sohbet geçmişine ekle
 */
function addToHistory(guildId, userId, role, content) {
    const history = getHistory(guildId, userId);
    history.push({ role, parts: [{ text: content }] });
    if (history.length > MAX_HISTORY * 2) {
        history.splice(0, 2);
    }
}

/**
 * Gemini'ye mesaj gönder
 */
/**
 * AI Sohbet Fonksiyonu (Overloaded)
 * Desteklenen imzalar:
 * 1. chat(message) - Standart mesaj eventinden
 * 2. chat(guildId, userId, username, content, channel) - Manuel çağrılar (Welcome vb.)
 */
async function chat(arg1, arg2, arg3, arg4, arg5) {
    let guild, author, content, channel;
    let message = null;

    // İmza Kontrolü
    if (typeof arg1 === 'object' && arg1.guild) {
        // Durum 1: chat(message) - messageObj
        message = arg1;
        guild = message.guild;
        author = message.author;
        content = message.content;
        channel = message.channel;

        // cleanContent varsa (ikinci argüman olarak gelmiş olabilir ama burada message objesi tek argüman varsayalım)
        // Eğer arg2 string ise cleanContent olabilir
        if (typeof arg2 === 'string') content = arg2;

    } else {
        // Durum 2: chat(guildId, userId, username, content, channel)
        const guildId = arg1;
        const userId = arg2;
        const username = arg3;
        content = arg4;
        channel = arg5;

        // Mock Objeler
        guild = { id: guildId, ownerId: 'UNKNOWN', members: { me: { id: 'BOT_ID' } } };
        if (channel && channel.guild) guild = channel.guild;

        author = {
            id: userId,
            username: username,
            tag: username + '#0000',
            send: async (msg) => { console.log("DM Mock:", msg); }
        };
    }

    if (!content) return { success: false, response: '❌ İçerik boş olamaz.' };

    let imageAnalysis = "";

    // --- RUH HALİ SİMÜLASYONU ---
    const oldMood = currentMood;
    if (Math.random() < 0.1) {
        currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];
        console.log("[AI MOOD] 🎭 Ruh hali değişti: " + oldMood + " → " + currentMood);
    }
    console.log("[AI MOOD] 💭 Şu anki ruh hali: " + currentMood);

    // --- BAĞLAM OLUŞTURMA (CONTEXT) ---

    // Özel Kullanıcı Kontrolü
    const isOwner = author.id === guild.ownerId;
    const isDev = ['necati9880', 'luminexcode'].includes(author.username);

    let userTitle = "Kullanıcı";
    if (isOwner) userTitle = "👑 SUNUCU SAHİBİ";
    if (isDev) userTitle = "🛠️ GELİŞTİRİCİ (YARATICIN)";

    // Hafıza (Learning System - Kişiselleştirilmiş)
    const longTermMemory = await getMemory(guild.id, author.username, author.id);
    const knowledgeBase = getKnowledgeBase(guild.id, content); // Soru ile ilgili wiki

    // Son mesajları al
    let recentMessagesText = "";
    try {
        if (channel && channel.messages) {
            const recentMessages = await channel.messages.fetch({ limit: 10 });
            recentMessagesText = recentMessages.reverse().map(m => {
                return `${m.author.username}: ${m.content}`;
            }).join('\n');
        } else {
            // Mock channel or no history access
            recentMessagesText = await fileMemory.getRecentContext(guild.id, 5);
        }
    } catch (err) {
        console.warn("[AI CONTEXT] Geçmiş mesajlar alınamadı:", err.message);
    }

    // --- PROMPT İNŞASI - LUMINEX AI v2.0 ---
    const additionalContext = `
[ORTAM BİLGİSİ]
- Sunucu: ${guild.name}
- Kanal: ${channel ? channel.name : 'Bilinmiyor'}
- Tarih: ${moment().format('LLLL')}
- Kullanıcı: ${author.username} (${userTitle})

[HAFIZA ve BİLGİ]
${longTermMemory}
${knowledgeBase}
${imageAnalysis ? `[GÖRSEL ANALİZ\n${imageAnalysis}\n` : ''}

[SON MESAJLAR]
${recentMessagesText}

[GÖREV]
Sen LUMINEX AI'sın. Türkçe, nazik ve yardımsever yanıt ver.
Kullanıcı mesajı: "${content}"

Yanıt ver:`;

    // Yeni sistem promptumuzu kullanalım
    const fullPrompt = LUMINEX_SYSTEM_PROMPT.replace('{ADDITIONAL_CONTEXT}', additionalContext);

    let response = "";
    let usedModel = "unknown";

    // === SADECE OLLAMA (Luminex AI) - En iyi Türkçe performans ===
    let ollamaOk = await checkOllamaHealth();
    if (ollamaOk) {
        try {
            // SADECE Llama 3.2 kullanılacak
            const modelsToTry = ['llama3.2'];

            for (const modelName of modelsToTry) {
                try {
                    console.log(`[AI] 🤖 Luminex AI (${modelName}) deneniyor...`);
                    const result = await callOllama(fullPrompt, { model: modelName });

                    if (result && result.trim().length > 0) {
                        response = result;
                        usedModel = `Luminex AI (${modelName})`;
                        console.log(`[AI] ✅ ${modelName} başarılı! (${response.length} karakter)`);
                        break; // Başarılı olunca döngüden çık
                    }
                } catch (modelErr) {
                    console.warn(`[AI] ⚠️ ${modelName} hatası:`, modelErr.message);
                    continue;
                }
            }
        } catch (err) {
            console.error("[AI] ❌ Ollama genel hatası:", err.message);
        }
    }



    // === HATA: Hiçbir AI çalışmıyor ===
    if (!response || response.trim().length === 0) {
        return { success: false, response: "😔 Şu an yapay zeka servislerine ulaşamıyorum. Lütfen daha sonra tekrar dene." };
    }

    // --- SON İŞLEMLER ---

    // Hafızaya kaydet
    await fileMemory.logConversation(guild.id, author.id, author.username, content, response);
    addToHistory(guild.id, author.id, 'user', content);
    addToHistory(guild.id, author.id, 'model', response);

    return {
        success: true,
        response: response,
        hasCommand: response.includes('[KOMUT:'),
        hasProposal: response.includes('[ONERI:'),
        model: usedModel
    };
}

function parseCommand(response) {
    const regex = /\[(KOMUT|ONERI):([^\]]+)\]/g;
    // Hem KOMUT hem ONERI yakalar
    const commands = [];
    let match;
    while ((match = regex.exec(response)) !== null) {
        const type = match[1]; // KOMUT veya ONERI
        const parts = match[2].split(':');
        commands.push({
            type: type,
            command: parts[0],
            params: parts.slice(1),
            fullMatch: match[0]
        });
    }
    return commands.length > 0 ? commands : null;
}

// Eski executeCommand fonksiyonunu yeni modüle yönlendiriyoruz
async function executeCommand(command, message, client) {
    return await executeAICommand(command, message, client);
}


/**
 * Sohbet geçmişini temizle
 */
function clearHistory(guildId, userId) {
    const key = guildId + "_" + userId;
    conversationHistory.delete(key);
}

/**
 * PROAKTİF SUNUCU ANALİZİ (Idle Reflection)
 * Eski idleResearch yerine geçer.
 * ARTIK DAHA AKILLI: İstatistikleri takip eder ve trendleri analiz eder.
 * Ollama (Llama 3.2) öncelikli, Gemini fallback
 */
async function idleReflection(guild) {
    if (!guild) return null;

    console.log("[AI REFLECTION] 🧠 Derin Analiz & Öngörü: " + guild.name);

    try {
        // 1. İstatistikleri Kaydet & Trendleri Al
        await fileMemory.logStat(guild.id, 'memberCount', guild.memberCount);
        await fileMemory.logStat(guild.id, 'channelCount', guild.channels.cache.size);

        const memberTrend = await fileMemory.getTrends(guild.id, 'memberCount');
        const adaptiveProfile = await fileMemory.getAdaptiveProfile(guild.id);
        const activityReport = await fileMemory.getActivityReport(guild.id);
        const visionTrends = await fileMemory.getVisionTrends(guild.id);

        // Sunucu Verilerini Topla
        const channelCount = guild.channels.cache.size;
        const memberCount = guild.memberCount;
        const roleCount = guild.roles.cache.size;

        // Rastgele 5 kanal ismi
        const channels = guild.channels.cache.map(c => c.name).slice(0, 10).join(', ');

        // Analiz Promptu (GELİŞTİRİLDİ - Phase 7)
        const prompt = "Sen Luminex, bu sunucunun stratejik yapay zeka yöneticisisin.\n\n" +
            "📊 VERİ & TRENDLER:\n" +
            "- Üye Sayısı: " + memberCount + " (" + memberTrend + ")\n" +
            "- Kanal Sayısı: " + channelCount + "\n" +
            "- Rol Sayısı: " + roleCount + "\n" +
            "- Adaptasyon Profilin: " + adaptiveProfile + "\n" +
            "- 🔥 AKTİVİTE RAPORU: " + activityReport + "\n" +
            "- 🖼️ GÖRSEL TRENDLER: " + visionTrends + "\n\n" +

            "GÖREVİN (Derin Analiz & Aktivite Yönetimi):\n" +
            "        Verilere bakarak durumu yorumla.\n" +
            "        1. **Aktivite Kontrolü:** Eğer aktivite \"Düşük (Ölü)\" ise, sunucuyu canlandıracak bir etkinlik veya tartışma başlatmalısın.\n" +
            "           - Örn: \"Sohbet ölü, hadi bir oyun başlatalım.\" -> [ONERI:etkinlik-olustur:Oyun Gecesi]\n" +
            "        2. **Görsel Analiz:** Eğer bir kanalda çok fazla görsel paylaşılıyorsa (örn: " + visionTrends + "), o kanalın amacına uygun bir öneri sun.\n" +
            "           - Örn: \"Sohbet kanalında çok resim atılıyor, bir 'Medya' kanalı açalım mı?\" -> [ONERI:kanal-olustur:medya]\n" +
            "        3. **İhtiyaç Tespiti:** Sunucuda eksik bir rol, kanal veya kural var mı?\n\n" +

            "    EĞER BİR FİKRİN VARSA (ÖNERİ SUN):\n" +
            "        Format: \"Analizime göre [Tespitin]... Bu yüzden şunu öneriyorum: [ONERI:komut:parametreler]\"\n\n" +
            "        Eğer her şey stabilse ama aktivite düşükse, sohbeti başlatacak yaratıcı bir soru sor.";

        let thought;

        // === 1. DENEME: OLLAMA ===
        try {
            const ollamaHealthy = await checkOllamaHealth();
            if (ollamaHealthy) {
                console.log(`[AI REFLECTION] 🦙 Ollama (${OLLAMA_MODEL}) ile analiz yapılıyor...`);
                thought = await callOllama(prompt);
            } else {
                throw new Error('Ollama bağlantısı yok');
            }
        } catch (ollamaErr) {
            // === 2. DENEME: GEMINI FALLBACK ===
            if (genAI) {
                console.log("[AI REFLECTION] 🔄 Gemini fallback kullanılıyor...");
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
                const result = await model.generateContent(prompt);
                thought = result.response.text();
            } else {
                throw new Error('Hiçbir AI servisi kullanılamıyor');
            }
        }

        console.log("[AI REFLECTION] 💭 Stratejik Analiz Sonucu: \n" + thought);

        return {
            shouldSpeak: true,
            content: thought
        };

    } catch (error) {
        console.error("[AI REFLECTION] ❌ Hata:", error.message);
    }
    return null;
}

module.exports = {
    chat,
    parseCommand,
    executeCommand,
    clearHistory,
    getHistory,
    idleReflection,
    addToHistory
};




