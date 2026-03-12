const { Events } = require("discord.js");
const db = require("croxydb");
const aiService = require("../utils/ai-service");

// Bu dosya SADECE "üye sunucuya KATILDIĞINDA" (girdiğinde) çalışır.
module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // 📋 Log: "Üye Katıldı" mesajı (giriş)
        try {
            const logSystem = require('../utils/log-system');
            await logSystem.logMemberJoin(member);
        } catch (e) { }

        // 1. Otorol İşlemi
        const rol = db.get(`otorol_${member.guild.id}`);
        if (rol) {
            // Rol ID olarak kaydedilmiş mi kontrol et
            const roleObj = member.guild.roles.cache.get(rol) ||
                member.guild.roles.cache.find(r => r.name === rol);
            if (roleObj) {
                member.roles.add(roleObj).catch(err => console.error("Otorol hatası:", err));
            } else {
                console.error(`Otorol bulunamadı: ${rol}`);
            }
        }

        // 2. AI Hoşgeldin Sistemi
        const isWelcomeActive = db.fetch(`module_${member.guild.id}_hosgeldin-sistemi`);
        if (!isWelcomeActive) return;

        // Hoşgeldin kanalı belirle (Log veya genel)
        // Genelde 'hosgeldin-kanali' diye bir ayar olur ama burada modül sistemine entegre ediyoruz.
        // Basitlik için veritabanında 'hosgeldin_kanal_GUILDID' yoksa 'gelen-giden', 'hosgeldin' ara.
        const welcomeChannelId = db.fetch(`hosgeldin_kanal_${member.guild.id}`);
        let channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) {
            channel = member.guild.channels.cache.find(c =>
                c.name.includes("gelen-giden") ||
                c.name.includes("hosgeldin") ||
                c.name.includes("welcome") ||
                c.name.includes("genel") ||
                c.name.includes("chat")
            );
        }

        if (channel) {
            // AI için prompt hazırla
            const prompt = `Sunucuya yeni biri katıldı!\n` +
                `Kullanıcı: ${member.user.tag}\n` +
                `Hesap Oluşturma: ${member.user.createdAt.toLocaleDateString()}\n` +
                `Sunucu: ${member.guild.name}\n\n` +
                `YAPMAN GEREKEN: Bu kullanıcı için kısa, samimi ve havalı bir "Hoş geldin" mesajı yaz. ` +
                `Sunucunun neşeli yapay zekası gibi davran. Abartılı emojiler kullanma ama samimi ol. ` +
                `Sadece mesajı yaz, başka bir şey yazma.`;

            try {
                // Hızlı yanıt için Gemini Flash kullanabiliriz veya varsayılan chat fonksiyonunu
                // Basit olması için chat fonksiyonunu "prompt" modunda kullanmak yerine
                // direkt model çağrısı yapmak daha iyi ama aiService.chat yapısını kullanmak tutarlılık sağlar.
                // Ancak chat fonksiyonu "komut" arar. Biz sadece metin istiyoruz.
                // aiService'e "generateText" gibi basit bir method eklemek iyi olurdu.
                // Şimdilik chat'e "userMessage" gibi atıp dönen cevabı alalım.

                // Simülasyon: "AI, yeni üyeye hoşgeldin de"
                const aiResponse = await aiService.chat(
                    member.guild.id,
                    member.user.id,
                    member.user.username,
                    `Sunucuya yeni biri geldi: ${member.user.tag}. Ona kısa ve hoş bir karşılama mesajı yaz.`,
                    channel // Kanal bağlamı
                );

                if (aiResponse && aiResponse.response) {
                    let finalResponse = aiResponse.response;

                    // Komutları ayıkla ve çalıştır
                    if (aiResponse.hasCommand) {
                        const commands = aiService.parseCommand(finalResponse);
                        if (commands) {
                            for (const cmd of commands) {
                                // Komutu metinden temizle
                                finalResponse = finalResponse.replace(cmd.fullMatch, '').trim();

                                // Komutu çalıştır
                                await aiService.executeCommand(cmd, {
                                    guild: member.guild,
                                    channel: channel,
                                    member: member,
                                    author: member.client.user
                                }, member.client);
                            }
                        }
                    }

                    if (finalResponse.length > 0) {
                        channel.send(finalResponse);
                    }
                }
            } catch (e) {
                console.error("AI Welcome Hatası:", e);
            }
        }
    }
};
