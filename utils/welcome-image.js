const { AttachmentBuilder } = require('discord.js');

/**
 * 🎨 Luminex Hoşgeldin Resmi Oluşturucu
 * Canvas ile özel karşılama kartı (canvas paketi gerekli)
 */

let Canvas, loadImage;
try {
    const canvasModule = require('@napi-rs/canvas');
    Canvas = canvasModule;
    loadImage = canvasModule.loadImage;
} catch {
    try {
        const canvasModule = require('canvas');
        Canvas = canvasModule;
        loadImage = canvasModule.loadImage;
    } catch {
        console.warn('[WELCOME-IMAGE] ⚠️ Canvas paketi yüklü değil. npm install @napi-rs/canvas');
    }
}

class WelcomeImage {
    /**
     * Hoşgeldin kartı oluştur
     */
    async create(member) {
        if (!Canvas) {
            return null; // Canvas yoksa null döner, metin fallback kullanılır
        }

        const canvas = Canvas.createCanvas(900, 300);
        const ctx = canvas.getContext('2d');

        // Arkaplan gradient
        const gradient = ctx.createLinearGradient(0, 0, 900, 300);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 900, 300);

        // Dekoratif çizgiler
        ctx.strokeStyle = 'rgba(94, 133, 238, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 50 + i * 60);
            ctx.lineTo(900, 30 + i * 60);
            ctx.stroke();
        }

        // Çerçeve
        ctx.strokeStyle = '#5e85ee';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 880, 280);

        // Hoşgeldin yazısı
        ctx.font = 'bold 42px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('HOŞGELDİN!', 550, 80);

        // Kullanıcı adı
        let username = member.user.username;
        if (username.length > 20) username = username.substring(0, 17) + '...';

        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillStyle = '#5e85ee';
        ctx.fillText(username, 550, 140);

        // Sunucu bilgisi
        ctx.font = '24px Arial, sans-serif';
        ctx.fillStyle = '#a0a0a0';
        ctx.fillText(`${member.guild.name} sunucusuna katıldın!`, 550, 185);

        // Üye sayısı
        ctx.font = '20px Arial, sans-serif';
        ctx.fillStyle = '#7289da';
        ctx.fillText(`#${member.guild.memberCount}. üyemiz`, 550, 230);

        // Avatar çemberi
        ctx.beginPath();
        ctx.arc(150, 150, 90, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        try {
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
            ctx.drawImage(avatar, 60, 60, 180, 180);
        } catch {
            ctx.fillStyle = '#5e85ee';
            ctx.fillRect(60, 60, 180, 180);
            ctx.font = 'bold 60px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(username[0].toUpperCase(), 150, 170);
        }

        const buffer = canvas.toBuffer('image/png');
        return new AttachmentBuilder(buffer, { name: 'welcome.png' });
    }
}

module.exports = new WelcomeImage();
