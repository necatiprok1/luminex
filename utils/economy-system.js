const db = require('./mongodb-helper');
const { EmbedBuilder } = require('discord.js');

/**
 * 💰 Luminex Ekonomi Sistemi
 * Coin kazanma, transfer, mağaza
 */

class EconomySystem {
    constructor() {
        this.CURRENCY_NAME = 'Luminex Coin';
        this.CURRENCY_EMOJI = '💎';
        this.DAILY_MIN = 100;
        this.DAILY_MAX = 500;
        this.DAILY_STREAK_BONUS = 50; // Her ardışık gün ek bonus
        this.WORK_COOLDOWN = 1800000; // 30 dakika
        this.WORK_MIN = 50;
        this.WORK_MAX = 300;

        // İş senaryoları
        this.JOBS = [
            { title: '👨‍💻 Yazılımcı', desc: 'Bir web sitesi kodladın', emoji: '💻' },
            { title: '🎨 Grafik Tasarımcı', desc: 'Logo tasarladın', emoji: '🖌️' },
            { title: '🎵 Müzisyen', desc: 'Bir konser verdin', emoji: '🎸' },
            { title: '📸 Fotoğrafçı', desc: 'Düğün fotoğrafı çektin', emoji: '📷' },
            { title: '🍕 Pizza Kuryesi', desc: 'Siparişleri teslim ettin', emoji: '🛵' },
            { title: '🏗️ Mühendis', desc: 'Bir köprü projesinde çalıştın', emoji: '⚙️' },
            { title: '🎮 Oyun Geliştirici', desc: 'Bir mobil oyun yaptın', emoji: '🕹️' },
            { title: '📚 Öğretmen', desc: 'Öğrencilere ders verdin', emoji: '✏️' },
            { title: '🔬 Bilim İnsanı', desc: 'Laboratuvarda deney yaptın', emoji: '🧪' },
            { title: '🎬 Video Editör', desc: 'YouTube videosu düzenledin', emoji: '🎥' },
            { title: '🚀 Uzay Mühendisi', desc: 'Roket tasarımı yaptın', emoji: '🛸' },
            { title: '🎯 Pazarlamacı', desc: 'Sosyal medya kampanyası yönetttin', emoji: '📊' },
        ];

        // Mağaza ürünleri (sunucu başına özelleştirilebilir)
        this.DEFAULT_SHOP_ITEMS = [
            { id: 'custom_role', name: '🎭 Özel Rol Rengi', desc: 'İstediğin renkte rol al', price: 5000 },
            { id: 'nickname_change', name: '✏️ Özel Lakap', desc: '1 lakap değişikliği hakkı', price: 1000 },
            { id: 'vip_badge', name: '⭐ VIP Rozeti', desc: 'Profilinde VIP rozeti', price: 10000 },
            { id: 'double_xp', name: '🔥 2x XP Boost', desc: '1 saat 2x XP kazan', price: 3000 },
            { id: 'lottery_ticket', name: '🎟️ Piyango Bileti', desc: 'Haftalık çekilişe katıl', price: 500 },
        ];
    }

    // ════════════════════════════════════
    // 💰 BAKİYE İŞLEMLERİ
    // ════════════════════════════════════

    async getBalance(guildId, userId) {
        return (await db.fetch(`eco_balance_${guildId}_${userId}`)) || 0;
    }

    async addBalance(guildId, userId, amount) {
        if (amount <= 0) return (await db.fetch(`eco_balance_${guildId}_${userId}`)) || 0;
        const key = `eco_balance_${guildId}_${userId}`;
        const current = (await db.fetch(key)) || 0;
        await db.set(key, current + amount);
        return current + amount;
    }

    async removeBalance(guildId, userId, amount) {
        const key = `eco_balance_${guildId}_${userId}`;
        const current = (await db.fetch(key)) || 0;
        const newBalance = Math.max(0, current - amount);
        // croxydb 0 değerini kabul etmez - 0 ise sil
        if (newBalance === 0) {
            await db.delete(key);
        } else {
            await db.set(key, newBalance);
        }
        return newBalance;
    }

    async transfer(guildId, fromUserId, toUserId, amount) {
        const fromBalance = await this.getBalance(guildId, fromUserId);
        if (fromBalance < amount) return { success: false, message: 'Yetersiz bakiye!' };
        if (amount <= 0) return { success: false, message: 'Geçersiz miktar!' };

        await this.removeBalance(guildId, fromUserId, amount);
        await this.addBalance(guildId, toUserId, amount);

        return { success: true, fromBalance: fromBalance - amount, toBalance: await this.getBalance(guildId, toUserId) };
    }

    // ════════════════════════════════════
    // 📅 GÜNLÜK ÖDÜL
    // ════════════════════════════════════

    async claimDaily(guildId, userId) {
        const lastClaimKey = `eco_daily_${guildId}_${userId}`;
        const streakKey = `eco_streak_${guildId}_${userId}`;
        const lastClaim = (await db.fetch(lastClaimKey)) || 0;
        const now = Date.now();

        // 24 saat kontrolü
        const dayMs = 86400000;
        if (now - lastClaim < dayMs) {
            const remaining = dayMs - (now - lastClaim);
            return { success: false, remaining };
        }

        // Streak kontrolü (48 saat içinde almadıysa streak sıfırlanır)
        let streak = (await db.fetch(streakKey)) || 0;
        if (now - lastClaim > dayMs * 2) {
            streak = 0; // Streak kırıldı
        }
        streak++;

        // Ödül hesapla
        const baseReward = Math.floor(Math.random() * (this.DAILY_MAX - this.DAILY_MIN + 1)) + this.DAILY_MIN;
        const streakBonus = (streak - 1) * this.DAILY_STREAK_BONUS;
        const totalReward = baseReward + streakBonus;

        // Kaydet
        await db.set(lastClaimKey, now);
        await db.set(streakKey, streak);
        const newBalance = await this.addBalance(guildId, userId, totalReward);

        return {
            success: true,
            baseReward,
            streakBonus,
            totalReward,
            streak,
            newBalance
        };
    }

    // ════════════════════════════════════
    // 💼 ÇALIŞMA
    // ════════════════════════════════════

    async work(guildId, userId) {
        const lastWorkKey = `eco_work_${guildId}_${userId}`;
        const lastWork = (await db.fetch(lastWorkKey)) || 0;
        const now = Date.now();

        if (now - lastWork < this.WORK_COOLDOWN) {
            return { success: false, remaining: this.WORK_COOLDOWN - (now - lastWork) };
        }

        // Rastgele iş seç
        const job = this.JOBS[Math.floor(Math.random() * this.JOBS.length)];
        const earnings = Math.floor(Math.random() * (this.WORK_MAX - this.WORK_MIN + 1)) + this.WORK_MIN;

        await db.set(lastWorkKey, now);
        const newBalance = await this.addBalance(guildId, userId, earnings);

        return {
            success: true,
            job,
            earnings,
            newBalance
        };
    }

    // ════════════════════════════════════
    // 🏪 MAĞAZA
    // ════════════════════════════════════

    async getShopItems(guildId) {
        return (await db.fetch(`eco_shop_${guildId}`)) || this.DEFAULT_SHOP_ITEMS;
    }

    async buyItem(guildId, userId, itemId) {
        const items = await this.getShopItems(guildId);
        const item = items.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Ürün bulunamadı!' };

        const balance = await this.getBalance(guildId, userId);
        if (balance < item.price) return { success: false, message: 'Yetersiz bakiye!' };

        await this.removeBalance(guildId, userId, item.price);

        // Satın alma geçmişi
        const purchaseKey = `eco_purchases_${guildId}_${userId}`;
        let purchases = (await db.fetch(purchaseKey)) || [];
        purchases.push({ itemId, name: item.name, price: item.price, date: Date.now() });
        await db.set(purchaseKey, purchases);

        return { success: true, item, newBalance: await this.getBalance(guildId, userId) };
    }

    // ════════════════════════════════════
    // 📊 EMBED'LER
    // ════════════════════════════════════

    async getBalanceEmbed(userId, guildId, memberOrUser) {
        const balance = await this.getBalance(guildId, userId);
        const streak = (await db.fetch(`eco_streak_${guildId}_${userId}`)) || 0;
        const user = memberOrUser?.user || memberOrUser;

        return new EmbedBuilder()
            .setColor('#2ECC71')
            .setAuthor({
                name: user?.tag || 'Kullanıcı',
                iconURL: user?.displayAvatarURL?.({ dynamic: true })
            })
            .setDescription(
                `${this.CURRENCY_EMOJI} **Bakiye:** \`${balance.toLocaleString()}\` ${this.CURRENCY_NAME}\n\n` +
                `🔥 **Günlük Streak:** \`${streak}\` gün\n` +
                `💡 *Günlük ödülünü almayı unutma! \`/günlük\`*`
            )
            .setFooter({ text: '💰 Luminex Ekonomi Sistemi' })
            .setTimestamp();
    }

    getDailyEmbed(userId, result) {
        if (!result.success) {
            const remaining = result.remaining;
            const hours = Math.floor(remaining / 3600000);
            const mins = Math.floor((remaining % 3600000) / 60000);

            return new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⏰ Günlük Ödül')
                .setDescription(`Günlük ödülünü zaten aldın! **${hours} saat ${mins} dakika** sonra tekrar gel.`)
                .setTimestamp();
        }

        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 Günlük Ödül!')
            .setDescription(
                `<@${userId}> günlük ödülünü aldı!\n\n` +
                `${this.CURRENCY_EMOJI} **Temel Ödül:** \`+${result.baseReward}\`\n` +
                (result.streakBonus > 0 ? `🔥 **Streak Bonusu:** \`+${result.streakBonus}\` (${result.streak} gün)\n` : '') +
                `\n💰 **Toplam:** \`+${result.totalReward}\` ${this.CURRENCY_NAME}\n` +
                `💳 **Yeni Bakiye:** \`${result.newBalance.toLocaleString()}\``
            )
            .setFooter({ text: `🔥 ${result.streak} günlük streak!` })
            .setTimestamp();
    }

    getWorkEmbed(userId, result) {
        if (!result.success) {
            const remaining = result.remaining;
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);

            return new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⏰ Çalışma')
                .setDescription(`Henüz dinlenmeden çalışamazsın! **${mins} dakika ${secs} saniye** sonra tekrar dene.`)
                .setTimestamp();
        }

        return new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`${result.job.emoji} ${result.job.title}`)
            .setDescription(
                `<@${userId}> çalıştı!\n\n` +
                `📝 **İş:** ${result.job.desc}\n` +
                `${this.CURRENCY_EMOJI} **Kazanç:** \`+${result.earnings}\` ${this.CURRENCY_NAME}\n` +
                `💳 **Yeni Bakiye:** \`${result.newBalance.toLocaleString()}\``
            )
            .setFooter({ text: '💼 30 dakika sonra tekrar çalışabilirsin' })
            .setTimestamp();
    }
}

module.exports = new EconomySystem();
