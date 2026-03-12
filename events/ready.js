const { ActivityType, Events } = require("discord.js")

// Sadece bu sunucuya spontan mesaj gönderilecek
const ALLOWED_SPONTANEOUS_SERVER = "Luminex Bot Test Merkezi";

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`${client.user.tag} Bot Hazır`);

        // --- AKTİF ÇEKİLİŞLERİ KONTROL ET (Restart Recovery) ---
        try {
            const giveawaySystem = require('../utils/giveaway-system');
            giveawaySystem.checkActiveGiveaways(client);
            console.log('[GIVEAWAY] 🎉 Aktif çekilişler kontrol edildi');
        } catch (e) {
            console.warn('[GIVEAWAY] Çekiliş kontrolü atlandı:', e.message);
        }
        // --- BOŞ ZAMAN AKTİVİTESİ (Idle Reflection - Proaktif Analiz) ---
        // Her 2 dakikada bir (120000 ms) sunucuyu analiz et
        // Her 1 dakikada bir kontrol döngüsü
        setInterval(async () => {
            const db = require('croxydb');
            const aiModule = require('../utils/ai-service');

            client.guilds.cache.forEach(async (guild) => {
                // 1. Proaktif Mod Kontrolü
                const isProactiveEnabled = db.fetch(`proaktif_mod_${guild.id}`);
                if (!isProactiveEnabled) return;

                // 2. Zamanlama Kontrolü
                const lastRun = db.fetch(`last_proactive_run_${guild.id}`) || 0;
                const intervalMinutes = db.fetch(`proaktif_aralik_${guild.id}`) || 30; // Varsayılan 30 dakika
                const intervalMs = intervalMinutes * 60 * 1000;

                if (Date.now() - lastRun < intervalMs) return;

                console.log(`[AI PROACTIVE] 🧠 ${guild.name} için analiz zamanı!`);

                try {
                    // Analiz Yap
                    const thoughtResult = await aiModule.idleReflection(guild);

                    if (thoughtResult && thoughtResult.shouldSpeak) {
                        // 3. Kanal Seçimi (Yapılandırılmış kanallardan biri)
                        let targetChannel;
                        const configuredChannels = db.fetch(`proaktif_kanallar_${guild.id}`) || [];

                        if (configuredChannels.length > 0) {
                            // Listeden rastgele bir kanal seç
                            const randomChannelId = configuredChannels[Math.floor(Math.random() * configuredChannels.length)];
                            targetChannel = guild.channels.cache.get(randomChannelId);
                        }

                        // Eğer yapılandırılmış kanal yoksa veya bulunamadıysa varsayılanlara bak (Fallback)
                        if (!targetChannel) {
                            // Eğer kanal ayarlanmamışsa proactive modda rastgele yere yazmak istemeyebiliriz.
                            // Ancak eski davranış benzer kanallara yazmaktı.
                            // Kullanıcı "belirlediğimiz kanallara" dediği için, eğer liste boşsa varsayılan genel'e yazsın mı?
                            // Güvenli olsun diye SystemChannel veya 'genel' deneyelim.
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

                            // Zaman damgasını güncelle
                            db.set(`last_proactive_run_${guild.id}`, Date.now());
                        } else {
                            console.log(`[AI PROACTIVE] ❌ Uygun kanal bulunamadı.`);
                        }
                    }
                } catch (err) {
                    console.error(`[AI PROACTIVE] Hata (${guild.name}):`, err);
                }
            });
        }, 60000); // Her dakika kontrol et
    }
};