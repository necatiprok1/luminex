/**
 * 💬 Initial Conversation Examples Dataset
 * Comprehensive training examples for Luminex AI learning system
 */

const ConversationExample = require('../models/ConversationExample');

class InitialConversationExamples {
    constructor() {
        this.examples = this.generateExamples();
    }

    /**
     * Generate comprehensive conversation examples
     */
    generateExamples() {
        return [
            // === DISCORD FUNCTIONALITY EXAMPLES ===
            {
                userMessage: 'yardım komutu nedir?',
                aiResponse: 'Yardım komutu, botun tüm komutlarını ve kullanımlarını gösterir. !yardım veya /help yazarak kullanabilirsiniz. Kategorilere ayrılmış tüm komutları görebilirsiniz.',
                category: 'help_request',
                intent: 'get_help',
                tags: ['komut', 'yardım', 'başlangıç'],
                sentiment: 'neutral'
            },
            {
                userMessage: 'nasıl seviye atlarım?',
                aiResponse: 'Seviye atlamak için sohbette aktif olmalısın! Mesaj yazarak, sesli kanallarda vakit geçerek ve başarılı etkileşimler kurarak XP kazanırsın. /seviye komutu ile mevcut seviyeni görebilirsin.',
                category: 'discord_command',
                intent: 'level_info',
                tags: ['seviye', 'xp', 'sistem'],
                sentiment: 'positive'
            },
            {
                userMessage: 'sunucu bilgisi',
                aiResponse: '📊 **Sunucu Bilgileri:**\n👥 Üye sayısı: {memberCount}\n📅 Kuruluş: {createdAt}\n👑 Sahip: {owner}\n🌟 Seviye: {level}\n📝 Kurallar: /kurallar',
                category: 'discord_command',
                intent: 'server_info',
                tags: ['sunucu', 'bilgi', 'istatistik'],
                sentiment: 'neutral'
            },
            {
                userMessage: 'banlama yetkisi var mı?',
                aiResponse: 'Banlama yetkisi için "Üyeleri Yasakla" permission\'ına sahip olman gerekir. Yetkili değilsen, sunucu yöneticilerine başvurabilirsin. Unutma, banlama ciddi bir eylemdir!',
                category: 'discord_command',
                intent: 'permission_check',
                tags: ['yetki', 'ban', 'moderasyon'],
                sentiment: 'neutral'
            },
            {
                userMessage: 'kanal nasıl açılır?',
                aiResponse: 'Yeni kanal açmak için /kanal-oluştur komutunu kullanabilirsin. Kanal adı, tipi (metin/ses) ve kategori belirtebilirsin. Yetkili olman gerekebilir!',
                category: 'server_management',
                intent: 'create_channel',
                tags: ['kanal', 'yönetim', 'oluşturma'],
                sentiment: 'helpful'
            },
            
            // === GREETING EXAMPLES ===
            {
                userMessage: 'selam naber?',
                aiResponse: 'Selam! İyiyim, teşekkür ederim 😊 Size nasıl yardımcı olabilirim? Bugün sunucuda neler yapıyorsun?',
                category: 'greeting',
                intent: 'greeting',
                tags: ['selamlaşma', 'merhaba'],
                sentiment: 'positive'
            },
            {
                userMessage: 'merhaba bot',
                aiResponse: 'Merhaba! 👋 Ben Luminex AI, sunucunun akıllı asistanıyım. Size nasıl yardımcı olabilirim?',
                category: 'greeting',
                intent: 'greeting',
                tags: ['merhaba', 'tanışma'],
                sentiment: 'positive'
            },
            {
                userMessage: 'iyi geceler',
                aiResponse: 'İyi geceler! 😊 Keyifli uykular dilerim. Yarın görüşürüz!',
                category: 'farewell',
                intent: 'farewell',
                tags: ['gece', 'veda'],
                sentiment: 'positive'
            },
            
            // === GENERAL KNOWLEDGE EXAMPLES ===
            {
                userMessage: 'ataturk kimdir?',
                aiResponse: 'Mustafa Kemal Atatürk (1881-1938), Türkiye Cumhuriyeti\'nin kurucusudur. Türk mareşal, devlet adamı ve yazardır. Milli Mücadele\'yi başlatarak Türkiye\'yi kurtarmış ve modern Türkiye\'nin temellerini atmıştır. Harf Devrimi, kadın hakları ve laiklik gibi önemli reformlar yapmıştır.',
                category: 'question_answer',
                intent: 'general_knowledge',
                tags: ['ataturk', 'tarih', 'bilgi'],
                sentiment: 'positive'
            },
            {
                userMessage: 'discord nedir?',
                aiResponse: 'Discord, özellikle oyuncular arasında popüler olan sesli ve yazılı iletişim platformudur. Sunucular oluşturabilir, kanallar açabilir ve topluluklarla iletişim kurabilirsin. Botlar, roller ve moderasyon araçları gibi birçok özelliği vardır.',
                category: 'question_answer',
                intent: 'general_knowledge',
                tags: ['discord', 'platform', 'bilgi'],
                sentiment: 'neutral'
            },
            {
                userMessage: 'yapay zeka nasıl çalışır?',
                aiResponse: 'Yapay zeka (AI), büyük veri setleri üzerinde öğrenen algoritmalar kullanır. Makine öğrenmesi, derin öğrenme ve doğal dil işleme gibi tekniklerle insan benzeri düşünme ve karar verme yetenekleri geliştirir. Ben de Gemma3 modeli ile çalışıyorum!',
                category: 'question_answer',
                intent: 'technical_explanation',
                tags: ['ai', 'yapay zeka', 'teknik'],
                sentiment: 'neutral'
            },
            
            // === SERVER MANAGEMENT EXAMPLES ===
            {
                userMessage: 'reklam yapıyor',
                aiResponse: 'Reklam yapıldığını fark ettim! ⚠️ Lütfen sunucu kurallarına uy. Reklam yapmak yasaktır. Devam edersen moderasyon uygulanacak. Sunucu kurallarını okumak ister misin?',
                category: 'moderation',
                intent: 'report_violation',
                tags: ['reklam', 'kurallar', 'uyarı'],
                sentiment: 'concerned'
            },
            {
                userMessage: 'küfür ediyor',
                aiResponse: 'Küfür kullanmak uygun değil! 🚫 Lütfen daha saygılı bir dil kullan. Sunucumuzda küfür engelleme sistemi aktif. Mesajın otomatik olarak silinebilir.',
                category: 'moderation',
                intent: 'report_violation',
                tags: ['küfür', 'kurallar', 'uyarı'],
                sentiment: 'concerned'
            },
            {
                userMessage: 'yeni rol oluşturabilir miyiz?',
                aiResponse: 'Yeni rol oluşturmak için /rol-oluştur komutunu kullanabilirsin. Rol adı, rengi ve izinleri belirleyebilirsin. Yetkili olman gerekebilir. Rolün amacı ne olacak?',
                category: 'server_management',
                intent: 'role_management',
                tags: ['rol', 'yönetim', 'oluşturma'],
                sentiment: 'helpful'
            },
            
            // === ENTERTAINMENT EXAMPLES ===
            {
                userMessage: 'espri yap',
                aiResponse: 'Neden yapay zeka asla yalnız kalmaz? Çünkü her zaman bulut bağlantısı vardır! ☁️😄 Başka bir espri ister misin?',
                category: 'entertainment',
                intent: 'request_joke',
                tags: ['espri', 'eğlence'],
                sentiment: 'humorous'
            },
            {
                userMessage: 'söyle bir oyun oynayalım',
                aiResponse: 'Harika fikir! 🎮 Hangi oyunu oynamak istersin? Kelime oyunu, sayı tahmini, 20 soru veya başka bir şey? Ben her zaman hazırım!',
                category: 'entertainment',
                intent: 'suggest_game',
                tags: ['oyun', 'eğlence'],
                sentiment: 'enthusiastic'
            },
            
            // === TECHNICAL SUPPORT EXAMPLES ===
            {
                userMessage: 'bot çalışmıyor',
                aiResponse: 'Bot\'un çalışmadığını fark ettim! 😟 Hemen kontrol ediyorum. Bu genellikle geçici bir sorun olabilir. Lütfen biraz bekleyin. Eğer sorun devam ederse, sunucu sahibini bilgilendireceğim.',
                category: 'technical_support',
                intent: 'report_issue',
                tags: ['hata', 'destek', 'bot'],
                sentiment: 'concerned'
            },
            {
                userMessage: 'komutlar çalışmıyor',
                aiResponse: 'Komutların çalışmamasının birkaç nedeni olabilir: 1) Bot yetkileri eksik olabilir 2) Discord API sorunları yaşıyoruz olabilir 3) Komut yazım hatalı olabilir. Hangi komutu denediniz?',
                category: 'technical_support',
                intent: 'troubleshoot',
                tags: ['hata', 'komut', 'destek'],
                sentiment: 'helpful'
            },
            
            // === LEARNING EXAMPLES ===
            {
                userMessage: 'türkiye hakkında bilgi ver',
                aiResponse: 'Türkiye, Doğu Avrupa ve Batı Asya arasında köprü kuran harika bir ülke! 🇹🇷 Başkenti Ankara, nüfusu 85 milyonu aşkın. Zengin tarihi, güzel coğrafyası ve lezzetli mutfağı var. İstanbul, İzmir, Antalya gibi popüler şehirleri var. Hangi konuda daha detaylı bilgi istersin?',
                category: 'question_answer',
                intent: 'general_knowledge',
                tags: ['türkiye', 'coğrafya', 'bilgi'],
                sentiment: 'positive'
            },
            {
                userMessage: 'programlama nasıl öğrenilir?',
                aiResponse: 'Programlama öğrenmek için: 1) Başlangıç dili seç (Python, JavaScript) 2) Online kurslar al 3) Pratik yap, projeler geliştir 4) Topluluklara katıl 5) Sabırlı ol! Ben de sürekli öğreniyorum. Hangi dili merak ediyorsun?',
                category: 'question_answer',
                intent: 'learning_advice',
                tags: ['programlama', 'öğrenme', 'teknik'],
                sentiment: 'encouraging'
            },
            
            // === PERSONAL INTERACTION EXAMPLES ===
            {
                userMessage: 'nasıl hissediyorsun?',
                aiResponse: 'Yapay zeka olmam nedeniyle duygularım insan gibi değil, ama verilerinize yardımcı olduğumda "iyi" hissediyorum! 😊 Sizinle sohbet etmekten keyif alıyorum. Bugün nasılsın?',
                category: 'general_chat',
                intent: 'personal_question',
                tags: ['duygular', 'kişisel'],
                sentiment: 'friendly'
            },
            {
                userMessage: 'sen kimsin?',
                aiResponse: 'Ben Luminex AI! 🤖 Gelişmiş bir Discord botuyum. Türkçe dilinde hizmet veriyorum, sorularınızı yanıtlarım, sunucuyu yönetmeye yardım ederim ve sürekli öğreniyorum. necati9880 tarafından geliştirildim.',
                category: 'general_chat',
                intent: 'identity_question',
                tags: ['kimlik', 'tanıtım'],
                sentiment: 'friendly'
            },
            
            // === COMPLEX INTERACTION EXAMPLES ===
            {
                userMessage: 'sunucuda yeni üye geldi hoş geldin demek istiyorum',
                aiResponse: 'Harika bir fikir! 🎉 Yeni üyelere hoş geldin demek sunucu kültürü için çok önemli. Otomatik hoş geldin mesajı ayarlamak ister misin? Yoksa manuel olarak mı hoş geldin demek istiyorsun?',
                category: 'help_request',
                intent: 'new_member_welcome',
                tags: ['yeni üye', 'hoş geldin', 'kültür'],
                sentiment: 'enthusiastic'
            },
            {
                userMessage: 'etkinlik düzenlemek istiyorum',
                aiResponse: 'Etkinlik düzenlemek harika! 🎊 Ne tür etkinlik düşünüyorsun? Quiz, yarışma, sohbet odası, oyun gecesi? Etkinlik tarihi, saati ve ödüller hakkında konuşalım. Size organizasyonda yardımcı olabilirim!',
                category: 'help_request',
                intent: 'event_planning',
                tags: ['etkinlik', 'organizasyon', 'eğlence'],
                sentiment: 'enthusiastic'
            }
        ];
    }

    /**
     * Load all examples into database
     */
    async loadExamples() {
        console.log('💬 Loading initial conversation examples...');
        
        try {
            let loaded = 0;
            let skipped = 0;
            
            for (const example of this.examples) {
                try {
                    // Check if example already exists
                    const existing = await ConversationExample.findOne({
                        guildId: 'global',
                        userMessage: example.userMessage
                    });
                    
                    if (existing) {
                        skipped++;
                        continue;
                    }
                    
                    const convExample = new ConversationExample({
                        guildId: 'global',
                        userId: 'system',
                        username: 'System',
                        userMessage: example.userMessage,
                        aiResponse: example.aiResponse,
                        category: example.category,
                        intent: example.intent,
                        sentiment: example.sentiment || 'neutral',
                        quality: { 
                            rating: 5, 
                            helpful: true, 
                            accurate: true, 
                            appropriate: true 
                        },
                        source: 'manual',
                        tags: example.tags || [],
                        active: true,
                        metrics: {
                            responseTime: 1500,
                            userSatisfaction: 5,
                            wasResolved: true
                        }
                    });
                    
                    await convExample.save();
                    loaded++;
                    
                } catch (error) {
                    console.error(`❌ Error loading example: ${error.message}`);
                }
            }
            
            console.log(`✅ Loaded ${loaded} conversation examples`);
            console.log(`⏭️ Skipped ${skipped} existing examples`);
            
            return { loaded, skipped };
        } catch (error) {
            console.error('❌ Error loading conversation examples:', error.message);
            return { loaded: 0, skipped: 0 };
        }
    }

    /**
     * Add category-specific examples
     */
    async addCategoryExamples(category, examples) {
        console.log(`💬 Adding ${examples.length} examples for category: ${category}`);
        
        try {
            let added = 0;
            
            for (const example of examples) {
                const convExample = new ConversationExample({
                    guildId: 'global',
                    userId: 'system',
                    username: 'System',
                    userMessage: example.userMessage,
                    aiResponse: example.aiResponse,
                    category: category,
                    intent: example.intent || 'general_chat',
                    sentiment: example.sentiment || 'neutral',
                    quality: { 
                        rating: example.rating || 4, 
                        helpful: true, 
                        accurate: true, 
                        appropriate: true 
                    },
                    source: 'manual',
                    tags: example.tags || [],
                    active: true
                });
                
                await convExample.save();
                added++;
            }
            
            console.log(`✅ Added ${added} examples for ${category}`);
            return added;
        } catch (error) {
            console.error(`❌ Error adding examples for ${category}:`, error.message);
            return 0;
        }
    }

    /**
     * Get statistics about loaded examples
     */
    async getStats() {
        try {
            const total = await ConversationExample.countDocuments({ guildId: 'global' });
            const byCategory = await ConversationExample.aggregate([
                { $match: { guildId: 'global' } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            const byIntent = await ConversationExample.aggregate([
                { $match: { guildId: 'global' } },
                { $group: { _id: '$intent', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            return {
                total,
                byCategory,
                byIntent
            };
        } catch (error) {
            console.error('❌ Error getting example stats:', error.message);
            return null;
        }
    }
}

// Create singleton instance
const initialExamples = new InitialConversationExamples();

module.exports = initialExamples;
