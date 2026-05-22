const { Events } = require("discord.js");
const db = require("../utils/mongodb-helper");
const aiService = require("../utils/ai-service");

// Bu dosya SADECE "üye sunucuya KATILDIĞINDA" (girdiğinde) çalışır.
module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // 📋 Log: "Üye Katıldı" mesajı (giriş)
        try {
            const logSystem = require('../utils/log-system');
            await logSystem.logMemberJoin(member);
        } catch (e) {
            console.warn('[MEMBER-ADD] ⚠️  Failed to log member join:', e.message);
        }

        // ═══════════════════════════════════════════════════════
        // 🛡️ ANTİ-RAİD: KATILIM KONTROLÜ
        // ═══════════════════════════════════════════════════════
        try {
            const antiRaid = require('../utils/anti-raid-system');
            await antiRaid.handleMemberJoin(member);
        } catch (err) {
            console.warn('[MEMBER-ADD] ⚠️  Anti-raid system error:', err.message);
        }

        // ═══════════════════════════════════════════════════════
        // 📈 ANALİTİK: ÜYE KATILIM
        // ═══════════════════════════════════════════════════════
        try {
            const analytics = require('../utils/analytics-system');
            analytics.trackMemberFlow(member.guild.id, 'joins');
        } catch {}

        // 1. Otorol İşlemi
        const rol = await db.fetch(`otorol_${member.guild.id}`);
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
        // Dashboard 'hosgeldinkanal_GUILDID' anahtarını kullanıyor.
        const welcomeChannelId = await db.fetch(`hosgeldinkanal_${member.guild.id}`);
        const isAIWelcomeActive = await db.fetch(`aimod_${member.guild.id}`) !== false; // AI Modu açık mı?

        if (!welcomeChannelId) return;

        let channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) return;

        // ═══════════════════════════════════════════════════════
        // 🎨 HOŞGELDİN RESMİ
        // ═══════════════════════════════════════════════════════
        let welcomeImage = null;
        const welcomeImageEnabled = await db.fetch(`module_${member.guild.id}_hosgeldin-sistemi`);
        if (welcomeImageEnabled) {
            try {
                const welcomeImageGen = require('../utils/welcome-image');
                welcomeImage = await welcomeImageGen.create(member);
            } catch (e) {
                console.warn('[WELCOME-IMG] Resim oluşturma hatası:', e.message);
            }
        }

        if (channel && isAIWelcomeActive) { // AI hoşgeldin sistemi sadece AI modu açıksa çalışır
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
                    `Sunucuya yeni biri geldi: ${member.user.tag}. Ona kısa ve hoş bir karşılama mesajı yaz.`
                );

                if (aiResponse && aiResponse.success && aiResponse.response) {
                    let finalResponse = aiResponse.response;

                    // Komutları ayıkla ve çalıştır
                    if (aiResponse.hasCommand) {
                        const commands = aiService.parseCommand(finalResponse);
                        if (commands) {
                            for (const cmd of commands) {
                                finalResponse = finalResponse.replace(cmd.fullMatch, '').trim();
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
                        await channel.send({ content: finalResponse, files: welcomeImage ? [welcomeImage] : [] });
                    }
                } else {
                    // AI Yanıt veremezse yedek (Fallback) mesaj
                    const fallbackMessages = [
                        `👋 Hoş geldin **${member.user.username}**! Sunucumuza renk kattın.`,
                        `✨ Aramıza hoş geldin **${member.user.username}**. Keyifli vakit geçirmen dileğiyle!`,
                        `🤖 Selam **${member.user.username}**! Ben bu sunucunun yapay zekasıyım. Seninle tanıştığıma sevindim.`
                    ];
                    const randomMsg = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
                    await channel.send({ content: randomMsg, files: welcomeImage ? [welcomeImage] : [] });
                }
            } catch (e) {
                console.error("AI Welcome Hatası:", e);
                // Hata durumunda bile en basit mesajı gönder
                channel.send({ content: `👋 Hoş geldin ${member}!`, files: welcomeImage ? [welcomeImage] : [] }).catch(() => { });
            }
        } else if (channel) {
            // Sadece resim gönder (AI kapalıysa)
            channel.send({ content: `👋 Hoş geldin ${member}!`, files: welcomeImage ? [welcomeImage] : [] }).catch(() => { });
        }
    }
};
