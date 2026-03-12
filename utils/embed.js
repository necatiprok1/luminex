const { EmbedBuilder } = require("discord.js");
const emojis = require("./emojis");

/**
 * 🎨 Luminex Bot - Modern Embed Oluşturucu
 * Ultra premium Discord embed tasarımları
 */
class EmbedCreator {
    constructor() {
        // Modern Gradient Renk Paleti
        this.colors = {
            success: "#57F287",      // Yeşil
            error: "#ED4245",        // Kırmızı
            info: "#5865F2",         // Discord Blurple
            warning: "#FEE75C",      // Sarı
            default: "#2B2D31",      // Modern Koyu
            premium: "#F47FFF",      // Nitro Pembe
            boost: "#FF73FA",        // Boost Pembesi
            cyan: "#00D4FF",         // Cyan
            purple: "#9B59B6",       // Mor
            orange: "#E67E22",       // Turuncu
            mint: "#1ABC9C",         // Mint
            pink: "#FF6B9D",         // Pembe
        };
    }

    /**
     * ✅ Başarı Embed'i
     */
    success(description, options = {}) {
        const style = emojis.getMessageStyle('success');
        return this.baseEmbed(
            `${style.emoji} ${description}`,
            this.colors.success,
            options.title || "✨ Başarılı!",
            {
                ...options,
                footer: options.footer || { text: "İşlem başarıyla tamamlandı" }
            }
        );
    }

    /**
     * ❌ Hata Embed'i
     */
    error(description, options = {}) {
        const style = emojis.getMessageStyle('error');
        return this.baseEmbed(
            `${style.emoji} ${description}`,
            this.colors.error,
            options.title || "❌ Hata!",
            {
                ...options,
                footer: options.footer || { text: "Bir hata oluştu" }
            }
        );
    }

    /**
     * ℹ️ Bilgi Embed'i
     */
    info(description, options = {}) {
        return this.baseEmbed(
            `${emojis.static.info} ${description}`,
            this.colors.info,
            options.title || "ℹ️ Bilgi",
            options
        );
    }

    /**
     * ⚠️ Uyarı Embed'i
     */
    warning(description, options = {}) {
        return this.baseEmbed(
            `${emojis.static.warning} ${description}`,
            this.colors.warning,
            options.title || "⚠️ Uyarı!",
            options
        );
    }

    /**
     * 🔄 Yükleniyor Embed'i
     */
    loading(description = "İşlem yapılıyor...", options = {}) {
        return this.baseEmbed(
            `${emojis.animated.loading || '⏳'} ${description}`,
            this.colors.info,
            options.title || "⏳ Yükleniyor...",
            options
        );
    }

    /**
     * 🛡️ Moderasyon Embed'i
     */
    moderation(description, action, options = {}) {
        const actionEmojis = {
            ban: '🔨',
            kick: '👢',
            mute: '🔇',
            timeout: '⏰',
            warn: '⚠️',
            unban: '🔓',
            unmute: '🔊'
        };
        const emoji = actionEmojis[action] || '🛡️';

        return this.baseEmbed(
            `${emojis.success} ${description}`,
            this.colors.error,
            `${emoji} Moderasyon İşlemi`,
            {
                ...options,
                footer: options.footer || { text: `${action.charAt(0).toUpperCase() + action.slice(1)} işlemi` }
            }
        );
    }

    /**
     * 🎉 Eğlence Embed'i
     */
    fun(description, options = {}) {
        const funColors = [
            this.colors.cyan,
            this.colors.pink,
            this.colors.purple,
            this.colors.mint,
            this.colors.orange
        ];
        const randomColor = funColors[Math.floor(Math.random() * funColors.length)];

        return this.baseEmbed(
            description,
            options.color || randomColor,
            options.title || "🎉 Eğlence",
            options
        );
    }

    /**
     * 👤 Kullanıcı Bilgi Embed'i
     */
    userInfo(member, options = {}) {
        const status = member.presence?.status || 'offline';
        const statusInfo = {
            'online': { emoji: '🟢', text: 'Çevrimiçi', color: '#57F287' },
            'idle': { emoji: '🟡', text: 'Boşta', color: '#FEE75C' },
            'dnd': { emoji: '🔴', text: 'Rahatsız Etmeyin', color: '#ED4245' },
            'offline': { emoji: '⚫', text: 'Çevrimdışı', color: '#747F8D' }
        };
        const currentStatus = statusInfo[status] || statusInfo.offline;

        return new EmbedBuilder()
            .setColor(currentStatus.color)
            .setAuthor({
                name: `${member.user.tag}`,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(options.description || null)
            .setFooter({ text: `${currentStatus.emoji} ${currentStatus.text}` })
            .setTimestamp();
    }

    /**
     * 🏰 Sunucu Bilgi Embed'i
     */
    serverInfo(guild, options = {}) {
        return new EmbedBuilder()
            .setColor(this.colors.info)
            .setAuthor({
                name: guild.name,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription(options.description || null)
            .setFooter({ text: `🆔 ${guild.id}` })
            .setTimestamp();
    }

    /**
     * 🎵 Müzik Embed'i
     */
    music(description, options = {}) {
        return this.baseEmbed(
            `🎵 ${description}`,
            this.colors.purple,
            options.title || "🎶 Müzik",
            {
                ...options,
                footer: options.footer || { text: "🎧 Luminex Müzik Sistemi" }
            }
        );
    }

    /**
     * 💰 Ekonomi Embed'i
     */
    economy(description, options = {}) {
        return this.baseEmbed(
            `💰 ${description}`,
            this.colors.mint,
            options.title || "💰 Ekonomi",
            options
        );
    }

    /**
     * 📊 İstatistik Embed'i
     */
    stats(title, stats = [], options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || this.colors.info)
            .setTitle(`📊 ${title}`);

        if (stats.length > 0) {
            const description = stats.map(stat =>
                `${stat.emoji || emojis.decorations.bullet} **${stat.label}:** ${stat.value}`
            ).join('\n');
            embed.setDescription(description);
        }

        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.footer) embed.setFooter(options.footer);
        if (options.timestamp !== false) embed.setTimestamp();

        return embed;
    }

    /**
     * 🎯 İç Base Embed Builder
     */
    baseEmbed(description, color, defaultTitle, options = {}) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setDescription(description);

        if (options.title || defaultTitle) {
            embed.setTitle(options.title || defaultTitle);
        }

        if (options.footer) embed.setFooter(options.footer);
        if (options.timestamp !== false) embed.setTimestamp();
        if (options.image) embed.setImage(options.image);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.author) embed.setAuthor(options.author);
        if (options.fields) embed.addFields(options.fields);
        if (options.url) embed.setURL(options.url);

        return embed;
    }

    /**
     * 🎨 Custom Embed (Tam Özelleştirme)
     */
    custom(options = {}) {
        const embed = new EmbedBuilder();

        if (options.color) embed.setColor(options.color);
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.url) embed.setURL(options.url);
        if (options.author) embed.setAuthor(options.author);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.footer) embed.setFooter(options.footer);
        if (options.timestamp) embed.setTimestamp();
        if (options.fields) embed.addFields(options.fields);

        return embed;
    }

    /**
     * 📋 Sayfalandırılmış Embed
     * @param {Array} pages - Sayfa içerikleri
     * @param {number} currentPage - Mevcut sayfa (0-indexed)
     * @param {object} options - Ek ayarlar
     */
    paginated(pages, currentPage, options = {}) {
        const page = pages[currentPage];
        const embed = new EmbedBuilder()
            .setColor(options.color || this.colors.info)
            .setDescription(page.content || page)
            .setFooter({
                text: `📄 Sayfa ${currentPage + 1}/${pages.length}${options.footerText ? ` | ${options.footerText}` : ''}`,
                iconURL: options.footerIcon
            });

        if (page.title || options.title) {
            embed.setTitle(page.title || options.title);
        }
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.timestamp !== false) embed.setTimestamp();

        return embed;
    }

    /**
     * 📊 Progress Bar Embed
     */
    progress(title, current, max, options = {}) {
        const percentage = Math.round((current / max) * 100);
        const barLength = 20;
        const filled = Math.round((current / max) * barLength);
        const empty = barLength - filled;

        const progressBar = `${'▓'.repeat(filled)}${'░'.repeat(empty)}`;

        return this.baseEmbed(
            `\`[${progressBar}]\` **${percentage}%**\n${options.description || ''}`,
            options.color || this.colors.info,
            title,
            {
                ...options,
                footer: options.footer || { text: `${current}/${max}` }
            }
        );
    }

    /**
     * 🗳️ Oylama/Anket Embed'i
     */
    poll(title, description, options = {}) {
        return new EmbedBuilder()
            .setColor(options.color || this.colors.info)
            .setTitle(`📊 ${title}`)
            .setDescription(`${description}\n\n${emojis.decorations.line}\n${options.votingNote || '**Oy vermek için aşağıdaki emojilere tıklayın!**'}`)
            .setFooter(options.footer || { text: '🗳️ Oylama Sistemi' })
            .setTimestamp();
    }

    /**
     * 📢 Duyuru Embed'i
     */
    announcement(title, content, importance = 2, options = {}) {
        const importanceColors = {
            1: '#57F287',  // Yeşil - Düşük
            2: '#5865F2',  // Mavi - Normal
            3: '#FEE75C',  // Sarı - Orta
            4: '#E67E22',  // Turuncu - Yüksek
            5: '#ED4245'   // Kırmızı - Kritik
        };
        const importanceLabels = {
            1: '📗 Düşük Öncelik',
            2: '📘 Normal',
            3: '📙 Orta Öncelik',
            4: '📕 Yüksek Öncelik',
            5: '🚨 KRİTİK'
        };

        return new EmbedBuilder()
            .setColor(importanceColors[importance] || importanceColors[2])
            .setTitle(`📢 ${title}`)
            .setDescription(`${emojis.decorations.starLine}\n\n${content}\n\n${emojis.decorations.starLine}`)
            .addFields({ name: '📌 Öncelik Seviyesi', value: importanceLabels[importance] || importanceLabels[2] })
            .setFooter(options.footer || { text: '📣 Luminex Duyuru Sistemi' })
            .setTimestamp();
    }
}

module.exports = new EmbedCreator();
