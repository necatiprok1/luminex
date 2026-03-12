/**
 * 🎨 Luminex Bot - Merkezi Emoji Sistemi
 * Tüm emoji ve stil tanımlamaları burada bulunur.
 * 
 * DİKKAT: Animasyonlu emojiler sunucunuzda tanımlı olmalıdır.
 * Custom emoji ID'lerini kendi sunucunuzdaki değerlerle değiştirin.
 */

// ═══════════════════════════════════════════════════════════════
// 🎭 ANİMASYONLU EMOJİLER (Custom Discord Emojis)
// ═══════════════════════════════════════════════════════════════
const animated = {
    // ✅ Başarı / Onay Emojileri
    success: '<a:verified:1174004305880154112>',
    check: '<a:checkmark:1174004305880154112>',
    greenTick: '<a:greentick:1174004305880154112>',

    // ❌ Hata / Red Emojileri
    error: '<a:hayr:1193529197444993085>',
    cross: '<a:cross:1193529197444993085>',
    redX: '<a:redx:1193529197444993085>',

    // 🔄 Yükleme / İşlem Emojileri
    loading: '<a:loading:1174020100000000000>',
    typing: '<a:typing:1174020100000000001>',
    processing: '<a:processing:1174020100000000002>',
    spin: '<a:spin:1174020100000000003>',

    // 🌟 Özel Emojiler
    dev: '<a:DEV:1174020139029643336>',
    partner: '<:DEVA:1174020166326161540>',
    sparkle: '<a:sparkles:1174020100000000004>',
    star: '<a:star:1174020100000000005>',
    rainbow: '<a:rainbow:1174020100000000006>',

    // 🎉 Kutlama Emojileri
    party: '<a:party:1174020100000000007>',
    confetti: '<a:confetti:1174020100000000008>',
    celebrate: '<a:celebrate:1174020100000000009>',
    tada: '<a:tada:1174020100000000010>',

    // 💫 Efekt Emojileri
    fire: '<a:fire:1174020100000000011>',
    wave: '<a:wave:1174020100000000012>',
    boost: '<a:boost:1174020100000000013>',
    crown: '<a:crown:1174020100000000014>',

    // 💗 Kalp Emojileri
    heart: '<a:heart:1174020100000000015>',
    heartbeat: '<a:heartbeat:1174020100000000016>',
    heartarrow: '<a:heartarrow:1174020100000000017>',

    // ⚡ Hız/Güç Emojileri
    lightning: '<a:lightning:1446825972015038534>',
    rocket: '<a:rocket:1174020100000000019>',
    thunder: '<a:thunder:1174020100000000020>',
};

// ═══════════════════════════════════════════════════════════════
// 🔷 STATİK EMOJİLER (Unicode & Custom)
// ═══════════════════════════════════════════════════════════════
const staticEmojis = {
    // ═══ GENEL ═══
    bot: '🤖',
    user: '👤',
    users: '👥',
    server: '🏰',
    channel: '💬',
    globe: '🌐',
    world: '🌍',

    // ═══ DURUM ═══
    online: '🟢',
    idle: '🟡',
    dnd: '🔴',
    offline: '⚫',
    streaming: '🟣',

    // ═══ İŞLEM ═══
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    question: '❓',
    exclamation: '❗',

    // ═══ MODERASYON ═══
    ban: '🔨',
    kick: '👢',
    mute: '🔇',
    timeout: '⏰',
    warn: '⚠️',
    lock: '🔒',
    unlock: '🔓',
    shield: '🛡️',

    // ═══ MÜZİK / MEDYA ═══
    music: '🎵',
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    repeat: '🔁',
    shuffle: '🔀',
    volume: '🔊',
    mic: '🎤',
    headphones: '🎧',

    // ═══ EĞLENCE ═══
    dice: '🎲',
    game: '🎮',
    trophy: '🏆',
    medal: '🎖️',
    gift: '🎁',
    balloon: '🎈',
    party: '🎉',
    confetti: '🎊',
    magic: '✨',
    sparkles: '💫',

    // ═══ RAKAMLAR ═══
    num0: '0️⃣',
    num1: '1️⃣',
    num2: '2️⃣',
    num3: '3️⃣',
    num4: '4️⃣',
    num5: '5️⃣',
    num6: '6️⃣',
    num7: '7️⃣',
    num8: '8️⃣',
    num9: '9️⃣',
    num10: '🔟',

    // ═══ OKLAR ═══
    arrowUp: '⬆️',
    arrowDown: '⬇️',
    arrowLeft: '⬅️',
    arrowRight: '➡️',
    arrowUpRight: '↗️',
    arrowDownRight: '↘️',
    arrowUpLeft: '↖️',
    arrowDownLeft: '↙️',
    refresh: '🔄',

    // ═══ ZAMAN ═══
    clock: '🕐',
    hourglass: '⏳',
    alarm: '⏰',
    calendar: '📅',

    // ═══ PARA / EKONOMİ ═══
    money: '💰',
    coin: '🪙',
    gem: '💎',
    bank: '🏦',
    dollar: '💵',
    chart: '📈',

    // ═══ ARAÇLAR ═══
    tools: '🛠️',
    gear: '⚙️',
    wrench: '🔧',
    hammer: '🔨',
    key: '🔑',
    magnify: '🔍',
    link: '🔗',
    clipboard: '📋',
    folder: '📁',
    file: '📄',
    book: '📖',

    // ═══ KATEGORLER ═══
    home: '🏠',
    moderation: '🛡️',
    fun: '🎉',
    utility: '🔧',
    music: '🎵',
    economy: '💰',
    admin: '👑',
    owner: '👑',

    // ═══ OY / REAKSİYON ═══
    thumbsUp: '👍',
    thumbsDown: '👎',
    star: '⭐',
    fire: '🔥',
    heart: '❤️',
    clap: '👏',

    // ═══ HAVA DURUMU ═══
    sun: '☀️',
    moon: '🌙',
    cloud: '☁️',
    rain: '🌧️',
    snow: '❄️',
    thunder: '⛈️',
    rainbow: '🌈',

    // ═══ YAZIŞMA ═══
    send: '📤',
    receive: '📥',
    mail: '📧',
    bell: '🔔',
    bellOff: '🔕',
    megaphone: '📢',
    pin: '📌',

    // ═══ ÇEVRE / DECO ═══
    dot: '•',
    arrow: '➜',
    dash: '━',
    line: '│',
    corner: '╭',
    divider: '═════════════════════',
};

// ═══════════════════════════════════════════════════════════════
// 🎨 RENK PALETİ
// ═══════════════════════════════════════════════════════════════
const colors = {
    // Ana Renkler
    primary: '#5865F2',      // Discord Blurple
    secondary: '#99AAB5',    // Discord Gri

    // Durum Renkleri
    success: '#57F287',      // Yeşil
    error: '#ED4245',        // Kırmızı
    warning: '#FEE75C',      // Sarı
    info: '#5865F2',         // Mavi

    // Özel Renkler
    premium: '#F47FFF',      // Pembe (Nitro)
    boost: '#FF73FA',        // Boost Pembesi
    partner: '#7289DA',      // Partner Mavisi

    // Gradyan Başlangıç/Bitiş
    gradientStart: '#667EEA',
    gradientEnd: '#764BA2',

    // Modern Renkler
    cyan: '#00D4FF',
    pink: '#FF6B9D',
    purple: '#9B59B6',
    orange: '#E67E22',
    mint: '#1ABC9C',
    coral: '#FF7F50',

    // Karanlık Tonlar
    dark: '#2C2F33',
    darker: '#23272A',
    darkest: '#1A1D21',

    // Açık Tonlar
    light: '#FFFFFF',
    lightGray: '#B9BBBE',
    mediumGray: '#72767D',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 KOMBİNE EMOJİ SETLER (Hızlı Erişim)
// ═══════════════════════════════════════════════════════════════
const sets = {
    // Başarı mesajları için
    successSet: {
        emoji: animated.success,
        color: colors.success,
        title: '✨ Başarılı!'
    },

    // Hata mesajları için
    errorSet: {
        emoji: animated.error,
        color: colors.error,
        title: '❌ Hata!'
    },

    // Uyarı mesajları için
    warningSet: {
        emoji: staticEmojis.warning,
        color: colors.warning,
        title: '⚠️ Uyarı!'
    },

    // Bilgi mesajları için
    infoSet: {
        emoji: staticEmojis.info,
        color: colors.info,
        title: 'ℹ️ Bilgi'
    },

    // Moderasyon mesajları için
    moderationSet: {
        emoji: staticEmojis.shield,
        color: colors.error,
        title: '🛡️ Moderasyon'
    },
};

// ═══════════════════════════════════════════════════════════════
// 🎭 DEKORATİF ELEMENTLER
// ═══════════════════════════════════════════════════════════════
const decorations = {
    // Çizgi Ayırıcılar
    line: '━━━━━━━━━━━━━━━━━━━━━━',
    doubleLine: '═══════════════════════',
    dashedLine: '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
    dotLine: '• • • • • • • • • • • •',
    starLine: '✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦',

    // Köşe Elementleri
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',

    // Kutu Çerçevesi
    boxTop: '╭────────────────────────────────────────╮',
    boxBottom: '╰────────────────────────────────────────╯',
    boxSide: '│',

    // Liste İşaretleri
    bullet: '◆',
    arrow: '➜',
    dot: '•',
    diamond: '◇',
    circle: '○',
    star: '✦',

    // Özel Desenler
    sparkle: '✨',
    dividerFancy: '┅┅┅✿┅┅┅',
    sectionBreak: '« ═══════ »',
};

// ═══════════════════════════════════════════════════════════════
// 📊 İLERLEME ÇUBUKLARI
// ═══════════════════════════════════════════════════════════════
const progressBars = {
    filled: '▓',
    empty: '░',
    start: '▐',
    end: '▌',

    /**
     * İlerleme çubuğu oluşturur
     * @param {number} current - Mevcut değer
     * @param {number} max - Maksimum değer
     * @param {number} length - Çubuk uzunluğu (varsayılan: 10)
     * @returns {string} İlerleme çubuğu
     */
    create: function (current, max, length = 10) {
        const percentage = current / max;
        const filled = Math.round(percentage * length);
        const empty = length - filled;
        return `\`[${'▓'.repeat(filled)}${'░'.repeat(empty)}]\` ${Math.round(percentage * 100)}%`;
    },

    /**
     * Emoji ile ilerleme çubuğu
     */
    createEmoji: function (current, max, length = 10) {
        const percentage = current / max;
        const filled = Math.round(percentage * length);
        const empty = length - filled;
        return `${'🟩'.repeat(filled)}${'⬜'.repeat(empty)} ${Math.round(percentage * 100)}%`;
    }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════

/**
 * Duruma göre emoji döndürür
 * @param {string} status - online/idle/dnd/offline
 * @returns {string} Durum emojisi
 */
function getStatusEmoji(status) {
    const statusMap = {
        'online': staticEmojis.online,
        'idle': staticEmojis.idle,
        'dnd': staticEmojis.dnd,
        'offline': staticEmojis.offline,
        'streaming': staticEmojis.streaming
    };
    return statusMap[status] || staticEmojis.offline;
}

/**
 * Duruma göre renk döndürür
 * @param {string} status - online/idle/dnd/offline
 * @returns {string} Renk hex kodu
 */
function getStatusColor(status) {
    const colorMap = {
        'online': '#57F287',
        'idle': '#FEE75C',
        'dnd': '#ED4245',
        'offline': '#747F8D',
        'streaming': '#9B59B6'
    };
    return colorMap[status] || '#747F8D';
}

/**
 * Kategori için emoji döndürür
 * @param {string} category - Kategori adı
 * @returns {string} Kategori emojisi
 */
function getCategoryEmoji(category) {
    const categoryMap = {
        'Bot': '🤖',
        'Moderasyon': '🛡️',
        'Kullanıcı': '👤',
        'Eğlence': '🎉',
        'Owner': '👑',
        'Müzik': '🎵',
        'Ekonomi': '💰',
        'Araçlar': '🔧',
        'Yardım': '❓'
    };
    return categoryMap[category] || '📁';
}

/**
 * Sayıyı emojiye çevirir (0-10)
 * @param {number} num - Sayı (0-10)
 * @returns {string} Sayı emojisi
 */
function numberToEmoji(num) {
    const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return numbers[num] || num.toString();
}

/**
 * Önem derecesine göre renk ve emoji döndürür
 * @param {number} level - Önem seviyesi (1-5)
 * @returns {object} {emoji, color, label}
 */
function getImportanceLevel(level) {
    const levels = {
        1: { emoji: '🟢', color: '#57F287', label: 'Düşük' },
        2: { emoji: '🔵', color: '#5865F2', label: 'Normal' },
        3: { emoji: '🟡', color: '#FEE75C', label: 'Orta' },
        4: { emoji: '🟠', color: '#E67E22', label: 'Yüksek' },
        5: { emoji: '🔴', color: '#ED4245', label: 'Kritik' }
    };
    return levels[level] || levels[2];
}

/**
 * Mesaj tipi için stil döndürür
 * @param {string} type - success/error/warning/info
 * @returns {object} {emoji, color, title}
 */
function getMessageStyle(type) {
    const styles = {
        success: {
            emoji: `${animated.success}`,
            color: colors.success,
            title: 'Başarılı!',
            icon: '✅'
        },
        error: {
            emoji: `${animated.error}`,
            color: colors.error,
            title: 'Hata!',
            icon: '❌'
        },
        warning: {
            emoji: staticEmojis.warning,
            color: colors.warning,
            title: 'Uyarı!',
            icon: '⚠️'
        },
        info: {
            emoji: staticEmojis.info,
            color: colors.info,
            title: 'Bilgi',
            icon: 'ℹ️'
        },
        loading: {
            emoji: animated.loading,
            color: colors.info,
            title: 'Yükleniyor...',
            icon: '⏳'
        }
    };
    return styles[type] || styles.info;
}

/**
 * Dekoratif başlık oluşturur
 * @param {string} title - Başlık metni
 * @param {string} emoji - Emoji (opsiyonel)
 * @returns {string} Dekore edilmiş başlık
 */
function createTitle(title, emoji = '✨') {
    return `${decorations.starLine}\n${emoji} **${title}** ${emoji}\n${decorations.starLine}`;
}

/**
 * Bilgi kartı oluşturur
 * @param {Array} items - [{label, value, emoji}] formatında
 * @returns {string} Formatlanmış bilgi kartı
 */
function createInfoCard(items) {
    return items.map(item =>
        `${item.emoji || decorations.bullet} **${item.label}:** ${item.value}`
    ).join('\n');
}

// ═══════════════════════════════════════════════════════════════
// 📤 MODÜL EXPORT
// ═══════════════════════════════════════════════════════════════
module.exports = {
    // Emoji koleksiyonları
    animated,
    static: staticEmojis,
    colors,
    sets,
    decorations,
    progressBars,

    // Yardımcı fonksiyonlar
    getStatusEmoji,
    getStatusColor,
    getCategoryEmoji,
    numberToEmoji,
    getImportanceLevel,
    getMessageStyle,
    createTitle,
    createInfoCard,

    // Kısayollar (hızlı erişim)
    success: animated.success,
    error: animated.error,
    loading: animated.loading,
    dev: animated.dev,
    partner: animated.partner,
};
