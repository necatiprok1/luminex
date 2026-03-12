const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('🎌 Rastgele bir anime önerisi gönderir'),
    run: async (client, interaction) => {
        await interaction.deferReply();

        try {
            // Popüler animelerden rastgele seç (daha güvenilir)
            const popularAnimeIds = [1, 5, 6, 20, 21, 30, 121, 199, 205, 223, 269, 431, 457, 777, 820, 853, 918, 1535, 1575, 1735, 2001, 2904, 4181, 5680, 9253, 11061, 11757, 16498, 20507, 21459, 22319, 30276, 31240, 31964, 32281, 33486, 35760, 37510, 38000, 39535, 40748, 41467, 42310, 44511, 48583, 49387, 50265, 50709, 51009, 52991];
            const randomId = popularAnimeIds[Math.floor(Math.random() * popularAnimeIds.length)];

            const response = await axios.get(`https://api.jikan.moe/v4/anime/${randomId}`);
            const anime = response.data.data;

            if (!anime) {
                throw new Error('Anime bulunamadı');
            }

            const genres = anime.genres?.map(g => g.name).join(', ') || 'Bilinmiyor';

            const embed = new EmbedBuilder()
                .setColor('#FF6B9D')
                .setTitle(`🎌 ${anime.title}`)
                .setURL(anime.url)
                .setDescription(`
${emojis.decorations.starLine}

ℹ️ **Bilgiler:**

◆ **Japonca:** ${anime.title_japanese || 'Bilinmiyor'}
◆ **Tür:** ${anime.type || 'Bilinmiyor'}
◆ **Bölüm:** ${anime.episodes || '?'}
◆ **Durum:** ${anime.status || 'Bilinmiyor'}
◆ **Puan:** ⭐ ${anime.score || 'N/A'}/10
◆ **Türler:** ${genres}

${emojis.decorations.line}

📖 **Özet:**
${anime.synopsis ? anime.synopsis.substring(0, 350) + '...' : 'Özet bulunamadı.'}

${emojis.decorations.starLine}
                `)
                .setThumbnail(anime.images?.jpg?.large_image_url || null)
                .setFooter({
                    text: `🎌 ${interaction.user.tag} için anime önerisi`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Anime hatası:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error || '❌'} **Hata!**\n\nAnime alınırken bir hata oluştu. Lütfen tekrar deneyin.`)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
