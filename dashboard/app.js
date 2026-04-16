const express = require('express');
const app = express();
const path = require('path');
const { ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { Conversation, Activity, ModLog } = require('../models/GuildMemory'); // Analytics Model
const db = require('croxydb');
const os = require('os');
const moment = require('moment');
require('moment-duration-format');

module.exports = (client) => {
    const port = process.env.PORT || 3000;

    // View Engine Setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Static Files (CSS/Images)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.urlencoded({ extended: true }));

    // 🌟 Ana Sayfa (Dashboard Home)
    app.get('/', async (req, res) => {
        try {
            // İstatistikler (Discord client API'den)
            const servers = client.guilds.cache.size;
            const users = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0); // This is total members, not unique users
            const channels = client.guilds.cache.reduce((a, b) => a + b.channels.cache.size, 0);

            // Sistem Bilgileri
            const uptime = moment.duration(client.uptime).format(" D [gün], H [saat], m [dakika], s [saniye]");
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const nodeVersion = process.version;
            const platform = process.platform;
            const cpuCount = os.cpus().length;

            // AI Sağlık Kontrolü
            const aiHealth = {
                openRouter: !!process.env.OPENROUTER_API_KEY,
                ollama: false,
                gemini: !!process.env.GEMINI_API_KEY,
                mongo: mongoose.connection.readyState === 1
            };

            // Ollama check (non-blocking) - Use URL from process.env if available
            try {
                const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
                const resp = await fetch(ollamaUrl + '/api/tags').catch(() => null);
                aiHealth.ollama = !!(resp && resp.ok);
            } catch (e) { }

            // AI Analiz İstatistikleri (MongoDB'den)
            let aiMsgCount = 0;
            if (mongoose.connection.readyState === 1) {
                aiMsgCount = await Conversation.countDocuments();
            }

            res.render('index', {
                bot: client.user,
                stats: {
                    guilds: servers, // Renamed from 'servers' to 'guilds' for consistency
                    users: users,
                    channels: channels,
                    aiMsgCount: aiMsgCount,
                    commands: 45 // Örnek değer
                },
                system: { uptime, memoryUsage, nodeVersion, platform, cpuCount, botStatus: client.presence.status },
                aiHealth
            });
        } catch (error) {
            console.error("Dashboard Error (Home):", error);
            res.status(500).send("Dashboard yüklenirken hata oluştu.");
        }
    });

    // 🌟 Sunucu Yönetim Sayfası (Geçici Parolasız / Eğitim için açık vizyonlu yaklaşım)
    app.get('/servers', async (req, res) => {
        // Gelişmiş sistemde burada OAuth2 girişi ve yetki denetimi olmalı
        const userGuilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
            memberCount: g.memberCount
        }));

        res.render('servers', {
            bot: client.user,
            guilds: userGuilds
        });
    });

    // 🌟 Özel Sunucu İstatistikleri ve Ayarları
    app.get('/server/:id', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.redirect('/servers');

        // Mevcut croxydb ayarlarını okuma
        const kufurEngel = db.fetch(`kufurengel_${guild.id}`) ? true : false;
        const reklamEngel = db.fetch(`reklamengel_${guild.id}`) ? true : false;
        const otorolId = db.fetch(`otorol_${guild.id}`);
        const hosgeldinKanalId = db.fetch(`hosgeldinkanal_${guild.id}`);
        const logKanalId = db.fetch(`log_channel_${guild.id}`);

        // Modül Durumları
        const aiMod = db.fetch(`aimod_${guild.id}`) !== false;
        const proactiveMod = db.fetch(`proaktif_mod_${guild.id}`) === true;
        const levelMod = db.fetch(`module_${guild.id}_seviye-sistemi`) !== false;
        const logMod = db.fetch(`module_${guild.id}_log-sistemi`) === true;

        // Seviye İstatistikleri (Liderlik Tablosu)
        const levelSystem = require('../utils/level-system');
        const leaderboard = levelSystem.getLeaderboard(guild.id, 5);

        // Sunucu Rolleri ve Kanalları
        const roles = guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name }));
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name }));

        // Veritabanından Analitik Veri (MongoDB Activity & ModLog)
        let topChannels = [];
        let modLogs = [];
        if (mongoose.connection.readyState === 1) {
            const activities = await Activity.find({ guildId: guild.id })
                .sort({ count: -1 })
                .limit(5);
            topChannels = activities.map(a => ({ name: a.channelName || 'Bilinmiyor', count: a.count }));

            modLogs = await ModLog.find({ guildId: guild.id })
                .sort({ timestamp: -1 })
                .limit(10);
        }

        res.render('server-detail', {
            bot: client.user,
            guild,
            settings: { kufurEngel, reklamEngel, otorolId, hosgeldinKanalId, logKanalId, aiMod, levelMod, logMod, proactiveMod },
            roles,
            textChannels,
            topChannels,
            leaderboard,
            modLogs
        });
    });

    // 🌟 Form Post İşlemleri (Ayarları Değiştir)
    app.post('/server/:id/update', (req, res) => {
        const guildId = req.params.id;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.redirect('/servers');

        // Kufur Engel Güncelleme
        if (req.body.kufurEngel === 'on') {
            db.set(`kufurengel_${guildId}`, true);
        } else {
            db.delete(`kufurengel_${guildId}`);
        }

        // Reklam Engel Güncelleme
        if (req.body.reklamEngel === 'on') {
            db.set(`reklamengel_${guildId}`, true);
        } else {
            db.delete(`reklamengel_${guildId}`);
        }

        // AI Mod Güncelleme
        if (req.body.aiMod === 'on') {
            db.set(`aimod_${guildId}`, true);
        } else {
            db.set(`aimod_${guildId}`, false);
        }

        // Proaktif Mod Güncelleme
        if (req.body.proactiveMod === 'on') {
            db.set(`proaktif_mod_${guildId}`, true);
        } else {
            db.set(`proaktif_mod_${guildId}`, false);
        }

        // Seviye Sistemi Güncelleme
        if (req.body.levelMod === 'on') {
            db.set(`module_${guildId}_seviye-sistemi`, true);
        } else {
            db.set(`module_${guildId}_seviye-sistemi`, false);
        }

        // Log Sistemi Güncelleme
        if (req.body.logMod === 'on') {
            db.set(`module_${guildId}_log-sistemi`, true);
        } else {
            db.set(`module_${guildId}_log-sistemi`, false);
        }

        // Otorol Güncelleme
        if (req.body.otorol && req.body.otorol !== 'none') {
            db.set(`otorol_${guildId}`, req.body.otorol);
        } else {
            db.delete(`otorol_${guildId}`);
        }

        // Hoşgeldin Kanalı Güncelleme
        if (req.body.welcomeChannel && req.body.welcomeChannel !== 'none') {
            db.set(`hosgeldinkanal_${guildId}`, req.body.welcomeChannel);
            db.set(`module_${guildId}_hosgeldin-sistemi`, true); // Modülü de aktif et
        } else {
            db.delete(`hosgeldinkanal_${guildId}`);
            db.delete(`module_${guildId}_hosgeldin-sistemi`);
        }

        // Log Kanalı Güncelleme
        if (req.body.logChannel && req.body.logChannel !== 'none') {
            db.set(`log_channel_${guildId}`, req.body.logChannel);
        } else {
            db.delete(`log_channel_${guildId}`);
        }

        // Başarılı döngü
        res.redirect(`/server/${guildId}?success=true`);
    });

    app.listen(port, () => {
        console.log(`[DASHBOARD] 🌐 Web paneli http://localhost:${port} adresinde aktif.`);
    });
};
