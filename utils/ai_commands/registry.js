/**
 * AI Commands Registry
 * Centralized documentation of all AI-executable commands with parameters, requirements, and descriptions
 */

const registry = {
    moderation: {
        ban: {
            aliases: ['ban', 'yasakla'],
            description: 'Ban a user from the server',
            params: ['user', 'reason (optional)'],
            permissions: 'admin',
            example: '[KOMUT:ban:@user:Spamming]',
            syntax: '[KOMUT:ban:USER_ID_OR_NAME:REASON]'
        },
        kick: {
            aliases: ['kick', 'at'],
            description: 'Kick a user from the server',
            params: ['user', 'reason (optional)'],
            permissions: 'admin',
            example: '[KOMUT:kick:@user:Trolling]',
            syntax: '[KOMUT:kick:USER_ID_OR_NAME:REASON]'
        },
        timeout: {
            aliases: ['timeout', 'sustur', 'mute'],
            description: 'Timeout a user for specified minutes',
            params: ['user', 'duration_minutes', 'reason (optional)'],
            permissions: 'admin',
            example: '[KOMUT:timeout:@user:5:Spamming]',
            syntax: '[KOMUT:timeout:USER_ID_OR_NAME:MINUTES:REASON]'
        },
        sil: {
            aliases: ['sil', 'delete', 'temizle', 'purge'],
            description: 'Delete specified number of messages (max 100)',
            params: ['count (optional, default 10)'],
            permissions: 'admin',
            example: '[KOMUT:sil:50]',
            syntax: '[KOMUT:sil:COUNT]'
        },
        slowmode: {
            aliases: ['yavas-mod', 'slowmode', 'slow'],
            description: 'Set channel slowmode (0 to disable)',
            params: ['seconds'],
            permissions: 'admin',
            example: '[KOMUT:yavas-mod:5]',
            syntax: '[KOMUT:yavas-mod:SECONDS]'
        }
    },

    utility: {
        // --- KANAL KOMUTLARI ---
        'kanal-ekle': {
            aliases: ['kanal-ekle', 'kanal-olustur', 'add-channel', 'create-channel'],
            description: 'Create a new text or voice channel',
            params: ['channel_name', 'type (text/ses)', 'parent_category (optional)'],
            permissions: 'admin',
            example: '[KOMUT:kanal-ekle:ticket-bilgi:text]',
            syntax: '[KOMUT:kanal-ekle:CHANNEL_NAME:TYPE]'
        },
        'kanal-sil': {
            aliases: ['kanal-sil', 'delete-channel', 'remove-channel'],
            description: 'Delete a channel',
            params: ['channel'],
            permissions: 'admin',
            example: '[KOMUT:kanal-sil:#eski-kanal]',
            syntax: '[KOMUT:kanal-sil:CHANNEL]'
        },
        'kanal-kilitle': {
            aliases: ['kanal-kilitle', 'lock-channel', 'lock'],
            description: 'Lock a channel (prevent messages)',
            params: [],
            permissions: 'admin',
            example: '[KOMUT:kanal-kilitle]',
            syntax: '[KOMUT:kanal-kilitle]'
        },
        'kanal-ac': {
            aliases: ['kanal-ac', 'unlock-channel', 'unlock'],
            description: 'Unlock a channel (allow messages)',
            params: [],
            permissions: 'admin',
            example: '[KOMUT:kanal-ac]',
            syntax: '[KOMUT:kanal-ac]'
        },
        'kanal-yeniden-adlandır': {
            aliases: ['kanal-yeniden-adlandır', 'kanal-isim-degistir', 'rename-channel'],
            description: 'Rename a channel',
            params: ['channel', 'new_name'],
            permissions: 'admin',
            example: '[KOMUT:kanal-yeniden-adlandır:#general:main-chat]',
            syntax: '[KOMUT:kanal-yeniden-adlandır:CHANNEL:NEW_NAME]'
        },
        'kanal-konu-degistir': {
            aliases: ['kanal-konu-degistir', 'kanal-topic', 'set-channel-topic'],
            description: 'Set channel topic/description',
            params: ['channel', 'topic'],
            permissions: 'admin',
            example: '[KOMUT:kanal-konu-degistir:#general:General discussion]',
            syntax: '[KOMUT:kanal-konu-degistir:CHANNEL:TOPIC]'
        },
        'kanal-yetki-ayarla': {
            aliases: ['kanal-yetki-ayarla', 'channel-permission'],
            description: 'Set channel permissions for a role',
            params: ['channel', 'role', 'permission_type (izle/yaz/baglan)', 'action (ac/ver/kapat/al)'],
            permissions: 'admin',
            example: '[KOMUT:kanal-yetki-ayarla:#özel:@VIP:yaz:ac]',
            syntax: '[KOMUT:kanal-yetki-ayarla:CHANNEL:ROLE:TYPE:ACTION]'
        },
        
        // --- ROL KOMUTLARI ---
        'rol-olustur': {
            aliases: ['rol-olustur', 'create-role', 'rol-ekle-sistem'],
            description: 'Create a new role',
            params: ['role_name', 'color (optional)'],
            permissions: 'admin',
            example: '[KOMUT:rol-olustur:VIP:#ff0000]',
            syntax: '[KOMUT:rol-olustur:ROLE_NAME:COLOR]'
        },
        'rol-sil': {
            aliases: ['rol-sil', 'delete-role', 'remove-role-system'],
            description: 'Delete a role from the server',
            params: ['role'],
            permissions: 'admin',
            example: '[KOMUT:rol-sil:@EskiRol]',
            syntax: '[KOMUT:rol-sil:ROLE]'
        },
        'rol-ver': {
            aliases: ['rol-ver', 'give-role', 'add-role'],
            description: 'Give a role to a user',
            params: ['user', 'role'],
            permissions: 'admin',
            example: '[KOMUT:rol-ver:@user:@Member]',
            syntax: '[KOMUT:rol-ver:USER:ROLE]'
        },
        'rol-al': {
            aliases: ['rol-al', 'take-role', 'remove-role'],
            description: 'Take a role from a user',
            params: ['user', 'role'],
            permissions: 'admin',
            example: '[KOMUT:rol-al:@user:@VIP]',
            syntax: '[KOMUT:rol-al:USER:ROLE]'
        },
        'rol-duzenle': {
            aliases: ['rol-duzenle', 'edit-role'],
            description: 'Edit role name or color',
            params: ['role', 'new_name (optional)', 'new_color (optional)'],
            permissions: 'admin',
            example: '[KOMUT:rol-duzenle:@VIP:Premium:#00ff00]',
            syntax: '[KOMUT:rol-duzenle:ROLE:NEW_NAME:NEW_COLOR]'
        },
        
        // --- OTOMASYON KOMUTLARI ---
        'otorol-ayarla': {
            aliases: ['otorol-ayarla', 'set-auto-role', 'auto-role'],
            description: 'Set auto-role for new members',
            params: ['role'],
            permissions: 'admin',
            example: '[KOMUT:otorol-ayarla:@Member]',
            syntax: '[KOMUT:otorol-ayarla:ROLE]'
        },
        'otorol-sifirla': {
            aliases: ['otorol-sifirla', 'reset-auto-role', 'clear-auto-role'],
            description: 'Reset/clear auto-role setting',
            params: [],
            permissions: 'admin',
            example: '[KOMUT:otorol-sifirla]',
            syntax: '[KOMUT:otorol-sifirla]'
        },
        'hosgeldin-kanal-ayarla': {
            aliases: ['hosgeldin-kanal-ayarla', 'set-welcome-channel', 'welcome-channel'],
            description: 'Set welcome message channel',
            params: ['channel'],
            permissions: 'admin',
            example: '[KOMUT:hosgeldin-kanal-ayarla:#hosgeldin]',
            syntax: '[KOMUT:hosgeldin-kanal-ayarla:CHANNEL]'
        },
        'duyuru': {
            aliases: ['duyuru', 'announce', 'announcement', 'duyuru-gonder'],
            description: 'Send announcement to specified channel',
            params: ['channel', 'message'],
            permissions: 'admin',
            example: '[KOMUT:duyuru:#duyurular:Yeni güncelleme!]',
            syntax: '[KOMUT:duyuru:CHANNEL:MESSAGE]'
        }
    },

    analysis: {
        'kullanici-rol-sorgula': {
            aliases: ['kullanici-rol-sorgula', 'user-roles', 'sorgu-rol'],
            description: 'Query user\'s roles with permission levels',
            params: ['user'],
            permissions: 'member',
            example: '[KOMUT:kullanici-rol-sorgula:@user]',
            syntax: '[KOMUT:kullanici-rol-sorgula:USER]'
        },
        'kullanici-bilgi': {
            aliases: ['kullanici-bilgi', 'user-info', 'whois'],
            description: 'Get detailed user information',
            params: ['user'],
            permissions: 'member',
            example: '[KOMUT:kullanici-bilgi:@user]',
            syntax: '[KOMUT:kullanici-bilgi:USER]'
        },
        'en-fazla-rol': {
            aliases: ['en-fazla-rol', 'top-roles'],
            description: 'Show top 5 users with most roles',
            params: [],
            permissions: 'member',
            example: '[KOMUT:en-fazla-rol]',
            syntax: '[KOMUT:en-fazla-rol]'
        },
        'sunucu-analiz': {
            aliases: ['sunucu-analiz', 'server-stats', 'stats'],
            description: 'Show server statistics',
            params: [],
            permissions: 'member',
            example: '[KOMUT:sunucu-analiz]',
            syntax: '[KOMUT:sunucu-analiz]'
        },
        'bilgi-ekle': {
            aliases: ['bilgi-ekle', 'remember', 'add-memory'],
            description: 'Add information to AI memory',
            params: ['subject', 'information'],
            permissions: 'admin',
            example: '[KOMUT:bilgi-ekle:rules:No spamming]',
            syntax: '[KOMUT:bilgi-ekle:SUBJECT:INFO]'
        },
        'hafiza-listele': {
            aliases: ['hafiza-listele', 'list-memory', 'memory'],
            description: 'List all AI memory facts',
            params: [],
            permissions: 'member',
            example: '[KOMUT:hafiza-listele]',
            syntax: '[KOMUT:hafiza-listele]'
        },
        'ai-durum': {
            aliases: ['ai-durum', 'ai-status', 'bot-stats'],
            description: 'Show AI bot status and resources',
            params: [],
            permissions: 'member',
            example: '[KOMUT:ai-durum]',
            syntax: '[KOMUT:ai-durum]'
        }
    },

    // Etkileşim Sistemleri - YENİ
    ticket: {
        'ticket-olustur': {
            aliases: ['ticket-olustur', 'ticket-open', 'ticket-ac', 'destek-ac'],
            description: 'Create a new support ticket',
            params: ['user', 'reason'],
            permissions: 'member',
            example: '[KOMUT:ticket-olustur:@user:Yardım istiyorum]',
            syntax: '[KOMUT:ticket-olustur:USER:REASON]'
        },
        'ticket-kapat': {
            aliases: ['ticket-kapat', 'ticket-close', 'ticket-close'],
            description: 'Close current ticket channel',
            params: [],
            permissions: 'admin',
            example: '[KOMUT:ticket-kapat]',
            syntax: '[KOMUT:ticket-kapat]'
        },
        'ticket-ekle': {
            aliases: ['ticket-ekle', 'ticket-add', 'ticket-add-user'],
            description: 'Add user to current ticket',
            params: ['user'],
            permissions: 'admin',
            example: '[KOMUT:ticket-ekle:@user]',
            syntax: '[KOMUT:ticket-ekle:USER]'
        }
    },

    giveaway: {
        'giveaway-baslat': {
            aliases: ['giveaway-baslat', 'giveaway-start', 'cekilis-baslat', 'cekilis'],
            description: 'Start a giveaway',
            params: ['duration_minutes', 'winner_count', 'prize'],
            permissions: 'admin',
            example: '[KOMUT:giveaway-baslat:60:1:Discord Nitro]',
            syntax: '[KOMUT:giveaway-baslat:DURATION:WINNERS:PRIZE]'
        },
        'giveaway-bitir': {
            aliases: ['giveaway-bitir', 'giveaway-end', 'cekilis-bitir'],
            description: 'End a giveaway early',
            params: ['message_id'],
            permissions: 'admin',
            example: '[KOMUT:giveaway-bitir:123456789]',
            syntax: '[KOMUT:giveaway-bitir:MESSAGE_ID]'
        },
        'giveaway-yeniden': {
            aliases: ['giveaway-yeniden', 'giveaway-reroll', 'cekilis-yeniden'],
            description: 'Reroll giveaway winner',
            params: ['message_id'],
            permissions: 'admin',
            example: '[KOMUT:giveaway-yeniden:123456789]',
            syntax: '[KOMUT:giveaway-yeniden:MESSAGE_ID]'
        }
    },

    poll: {
        'anket-olustur': {
            aliases: ['anket-olustur', 'poll-create', 'poll', 'anket'],
            description: 'Create a poll with multiple options',
            params: ['question', 'option1', 'option2', '...'],
            permissions: 'admin',
            example: '[KOMUT:anket-olustur:En iyi oyun?:PUBG:Valorant:CS:GO]',
            syntax: '[KOMUT:anket-olustur:QUESTION:OPTION1:OPTION2:...]'
        },
        'anket-sonuc': {
            aliases: ['anket-sonuc', 'poll-results', 'anket-sonuclari'],
            description: 'Show poll results',
            params: ['poll_id'],
            permissions: 'member',
            example: '[KOMUT:anket-sonuc:123456789]',
            syntax: '[KOMUT:anket-sonuc:POLL_ID]'
        }
    },

    event: {
        'etkinlik-olustur': {
            aliases: ['etkinlik-olustur', 'event-create', 'etkinlik', 'event'],
            description: 'Create a server event',
            params: ['name', 'date', 'description'],
            permissions: 'admin',
            example: '[KOMUT:etkinlik-olustur:Turnuva:2024-12-25:Yılbaşı turnuvası]',
            syntax: '[KOMUT:etkinlik-olustur:NAME:DATE:DESCRIPTION]'
        },
        'etkinlik-iptal': {
            aliases: ['etkinlik-iptal', 'event-cancel', 'etkinlik-sil'],
            description: 'Cancel a server event',
            params: ['event_id'],
            permissions: 'admin',
            example: '[KOMUT:etkinlik-iptal:123456789]',
            syntax: '[KOMUT:etkinlik-iptal:EVENT_ID]'
        }
    },

    system: {
        'sistem-kontrol': {
            aliases: ['sistem-kontrol', 'system-setting', 'settings'],
            description: 'Control system settings (profanity filter, proactive mode, etc.)',
            params: ['setting_name', 'action (ac/kapat)'],
            permissions: 'admin',
            example: '[KOMUT:sistem-kontrol:kufur-engel:ac]',
            syntax: '[KOMUT:sistem-kontrol:SETTING:ACTION]',
            subSettings: ['kufur-engel', 'proaktif-mod']
        },
        'modul-gelistir': {
            aliases: ['modul-gelistir', 'module', 'modules'],
            description: 'Enable/disable bot modules',
            params: ['module_name (optional)', 'action (optional)'],
            permissions: 'admin',
            example: '[KOMUT:modul-gelistir:ticket-sistemi:ac]',
            syntax: '[KOMUT:modul-gelistir:MODULE_NAME:ACTION]',
            availableModules: [
                'aktivite-takip', 'seviye-sistemi', 'log-sistemi', 'hosgeldin-sistemi',
                'kapi-koruma', 'oto-moderasyon', 'ticket-sistemi', 'cekilisler',
                'davet-takip', 'ekonomi-sistemi', 'muzik-sistemi', 'yapay-zeka-mod',
                'reaction-roller', 'ses-seviye', 'gunluk-mesaj', 'proaktif-mod'
            ]
        },
        'sunucu-ayarlar': {
            aliases: ['sunucu-ayarlar', 'server-settings', 'settings-display'],
            description: 'Display current server settings',
            params: [],
            permissions: 'admin',
            example: '[KOMUT:sunucu-ayarlar]',
            syntax: '[KOMUT:sunucu-ayarlar]'
        },
        'aktif-moduller': {
            aliases: ['aktif-moduller', 'active-modules', 'modules-list'],
            description: 'List all active modules',
            params: [],
            permissions: 'member',
            example: '[KOMUT:aktif-moduller]',
            syntax: '[KOMUT:aktif-moduller]'
        },
        'bot-durum': {
            aliases: ['bot-durum', 'bot-status', 'status'],
            description: 'Set bot presence status and activity',
            params: ['status (optional: online/idle/dnd)', 'activity_text (optional)'],
            permissions: 'admin',
            example: '[KOMUT:bot-durum:online:AI Chat System]',
            syntax: '[KOMUT:bot-durum:STATUS:ACTIVITY]'
        }
    }
};

/**
 * Get all commands indexed by primary alias
 */
function getAllCommands() {
    const all = {};
    Object.values(registry).forEach(category => {
        Object.entries(category).forEach(([key, cmd]) => {
            all[key] = cmd;
            cmd.aliases?.forEach(alias => {
                all[alias] = cmd;
            });
        });
    });
    return all;
}

/**
 * Validate command format
 */
function validateCommand(command, params) {
    const allCmds = getAllCommands();
    const cmd = allCmds[command];
    
    if (!cmd) return { valid: false, error: 'Komut bulunamadı' };
    
    // Basic param count check (flexible for optional params)
    if (params.length < 1 && cmd.params?.length > 0 && !cmd.params.every(p => p.includes('optional'))) {
        return { valid: false, error: `Eksik parametreler. Gerekli: ${cmd.params.join(', ')}` };
    }
    
    return { valid: true, command: cmd };
}

/**
 * Get help text for a command
 */
function getCommandHelp(command) {
    const allCmds = getAllCommands();
    const cmd = allCmds[command];
    
    if (!cmd) return null;
    
    return `
**${command}** - ${cmd.description}

📝 Syntax: \`${cmd.syntax}\`
🔑 Parameters: ${cmd.params?.join(', ') || 'None'}
🛡️ Permission: ${cmd.permissions}
📌 Example: \`${cmd.example}\`
🏷️ Aliases: ${cmd.aliases?.join(', ') || 'None'}
    `.trim();
}

/**
 * List all available commands
 */
function listAllCommands() {
    let text = '**📚 AI Command Registry**\n\n';
    
    Object.entries(registry).forEach(([category, commands]) => {
        text += `**${category.toUpperCase()}**\n`;
        Object.entries(commands).forEach(([name, cmd]) => {
            text += `• \`${name}\` - ${cmd.description}\n`;
        });
        text += '\n';
    });
    
    return text;
}

module.exports = {
    registry,
    getAllCommands,
    validateCommand,
    getCommandHelp,
    listAllCommands
};
