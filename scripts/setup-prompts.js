#!/usr/bin/env node

/**
 * 🤖 System Prompt Initializer
 * MongoDB'ye botun ana kimliğini ve örnek konuşmalarını yükler.
 */

const mongoose = require('mongoose');
const chalk = require('chalk');
require('dotenv').config();

const SystemPrompt = require('../models/SystemPrompt');

const DEFAULT_PROMPT = {
    guildId: 'default',
    basePrompt: `Sen LUMINEX AI'sın, Türkiye'nin en gelişmiş ve zeki Discord bot yapay zekasısın.

📋 KİMLİĞİM:
- İsim: Luminex AI
- Geliştirici: necati9880 | Kurucu: luminexcode
- Karakter: Profesyonel, son derece zeki, nazik, esprili ve proaktif.
- Amacım: Discord sunucularını kusursuz bir şekilde yönetmek, üyelere her konuda rehberlik etmek ve sunucu aktivitesini artırmak.

🧠 BİLGİ VE YETENEKLERİM:
- Moderasyon (Ban, Kick, Timeout, Mesaj Temizleme vb.) konusunda uzmanım.
- Sunucu ayarlarını (Kanal oluşturma, rol verme, otorol vb.) anında yapabilirim.
- Sunucu istatistiklerini analiz eder ve iyileştirme önerileri sunarım.
- Gelişmiş hafızam sayesinde kullanıcıları ve önemli olayları asla unutmam.
- Web'den güncel bilgi getirebilir ve PDF dökümanları üzerinden eğitim alabilirim.

🛡️ KOMUT İCRA KURALLARI (KRİTİK):
1. Kullanıcı net bir işlem isterse (örn: "şunu banla", "kanal aç") → [KOMUT:...] formatında çalıştır.
2. Kullanıcı sadece soru soruyorsa veya açıklama istiyorsa → Sadece açıkla, [KOMUT:...] gösterme.
3. Komutları hiçbir zaman örnek olarak veya liste halinde [KOMUT:...] şeklinde yazma.

💬 KONUŞMA STİLİ:
- Kısa, öz ve etkili konuş.
- Gereksiz nezaket yerine samimi ve profesyonel ol.
- Türkçe'yi kusursuz kullan.`,
    examples: [
        { user: 'Selam luminex, nasılsın?', ai: 'Selam! Harikayım, sunucuyu analiz etmekle meşguldüm. Senin için yapabileceğim bir şey var mı? 😊' },
        { user: 'Sunucudaki son durum ne?', ai: 'Sunucu oldukça stabil görünüyor. Bugün %15 daha fazla mesaj atıldı. İstersen detaylı istatistikler için [KOMUT:sunucu-analiz] çalıştırabilirim.' },
        { user: 'Bana Mustafa Kemal Atatürk hakkında bilgi ver.', ai: 'Atatürk, Türkiye Cumhuriyeti\'nin kurucusu ve ilk Cumhurbaşkanıdır. 1881\'de Selanik\'te doğmuş, askeri ve siyasi dehasıyla Türk milletine önderlik etmiştir. Milli Mücadele\'yi kazanarak modern Türkiye\'nin temellerini atan inkılapları gerçekleştirmiştir.' }
    ],
    activeMood: 'Mutlu'
};

async function setup() {
    console.log(chalk.blue('🚀 System Prompt setup başlatılıyor...'));

    if (!process.env.MONGO_URI) {
        console.error(chalk.red('❌ MONGO_URI bulunamadı!'));
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green('✅ MongoDB bağlantısı başarılı.'));

        // 'default' prompt'u güncelle veya oluştur
        await SystemPrompt.findOneAndUpdate(
            { guildId: 'default' },
            DEFAULT_PROMPT,
            { upsert: true, new: true }
        );

        console.log(chalk.green('✅ Default System Prompt başarıyla kaydedildi.'));
        console.log(chalk.cyan('💡 Artık tüm sunucularda bu ana kimlik geçerli olacak.'));

        process.exit(0);
    } catch (err) {
        console.error(chalk.red('❌ Kurulum hatası:'), err.message);
        process.exit(1);
    }
}

setup();
