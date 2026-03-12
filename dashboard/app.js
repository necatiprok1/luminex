const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const { Conversation, Activity } = require('../models/GuildMemory'); // Analytics Model
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
            const users = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0);
            const channels = client.guilds.cache.reduce((a, b) => a + b.channels.cache.size, 0);

            // Sistem Bilgileri
            const systemInfo = {
                uptime: moment.duration(process.uptime() * 1000).format("d [gün], h [saat], m [dakika]"),
                memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                nodeVersion: process.version,
                platform: os.platform(),
                cpuCount: os.cpus().length,
                botStatus: client.presence.status
            };

            // AI Analiz İstatistikleri (MongoDB'den)
            let aiMsgCount = 0;
            if (mongoose.connection.readyState === 1) {
                aiMsgCount = await Conversation.countDocuments();
            }

            res.render('index', {
                bot: client.user,
                stats: { servers, users, channels, aiMsgCount },
                system: systemInfo
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
        const aiMod = db.fetch(`aimod_${guild.id}`) !== false; // Varsayılan açık

        // Sunucu Rolleri ve Kanalları
        const roles = guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name }));
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name }));

        // Veritabanından Analitik Veri (MongoDB Activity)
        let topChannels = [];
        if (mongoose.connection.readyState === 1) {
            const activities = await Activity.find({ guildId: guild.id })
                .sort({ count: -1 })
                .limit(5);
            topChannels = activities.map(a => ({ name: a.channelName || 'Bilinmiyor', count: a.count }));
        }

        res.render('server-detail', {
            bot: client.user,
            guild,
            settings: { kufurEngel, reklamEngel, otorolId, hosgeldinKanalId, aiMod },
            roles,
            textChannels,
            topChannels
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

        // Otorol Güncelleme
        if (req.body.otorol && req.body.otorol !== 'none') {
            db.set(`otorol_${guildId}`, req.body.otorol);
        } else {
            db.delete(`otorol_${guildId}`);
        }

        // Hoşgeldin Kanalı Güncelleme
        if (req.body.welcomeChannel && req.body.welcomeChannel !== 'none') {
            db.set(`hosgeldinkanal_${guildId}`, req.body.welcomeChannel);
        } else {
            db.delete(`hosgeldinkanal_${guildId}`);
        }

        // Başarılı döngü
        res.redirect(`/server/${guildId}?success=true`);
    });

    app.listen(port, () => {
        console.log(`[DASHBOARD] 🌐 Web paneli http://localhost:${port} adresinde aktif.`);
    });
};
