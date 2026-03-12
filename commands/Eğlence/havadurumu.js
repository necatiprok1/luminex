const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('havadurumu')
        .setDescription('🌤️ Bir şehrin anlık hava durumunu gösterir')
        .addStringOption(option =>
            option.setName('sehir')
                .setDescription('Hava durumu bilgisi almak istediğiniz şehir')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const city = interaction.options.getString('sehir');

        // API key kontrolü - .env dosyasından alınmalı
        const apiKey = process.env.WEATHER_API_KEY || 'YOUR_API_KEY';

        if (apiKey === 'YOUR_API_KEY' || apiKey === 'API_KEY') {
            const noApiEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${emojis.error} **API Hatası!**\n\nHava durumu API anahtarı yapılandırılmamış.`)
                .setTimestamp();
            return interaction.reply({ embeds: [noApiEmbed], ephemeral: true });
        }

        try {
            await interaction.deferReply();

            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=tr`
            );

            const data = response.data;
            const weatherEmoji = {
                'Clear': '☀️',
                'Clouds': '☁️',
                'Rain': '🌧️',
                'Drizzle': '🌦️',
                'Thunderstorm': '⛈️',
                'Snow': '❄️',
                'Mist': '🌫️',
                'Fog': '🌫️',
                'Haze': '🌫️'
            };

            const emoji = weatherEmoji[data.weather[0].main] || '🌡️';
            const temp = Math.round(data.main.temp);
            const feelsLike = Math.round(data.main.feels_like);
            const humidity = data.main.humidity;
            const wind = data.wind.speed;
            const description = data.weather[0].description;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${emoji} ${city} Hava Durumu`)
                .setDescription(`
${emojis.decorations.starLine}

${emojis.static.globe || '🌍'} **Konum:** ${data.name}, ${data.sys.country}

${emojis.decorations.line}

🌡️ **Sıcaklık:** \`${temp}°C\`
🤒 **Hissedilen:** \`${feelsLike}°C\`
💧 **Nem:** \`${humidity}%\`
💨 **Rüzgar:** \`${wind} m/s\`

${emojis.decorations.line}

${emoji} **Durum:** ${description.charAt(0).toUpperCase() + description.slice(1)}

${emojis.decorations.starLine}
                `)
                .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
                .setFooter({
                    text: `🌤️ ${interaction.user.tag} için`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Hava durumu hatası:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`
${emojis.error} **Hata!**

${emojis.static.warning} Şehir bulunamadı veya hava durumu alınamadı.

${emojis.static.info} Lütfen geçerli bir şehir adı girin.
                `)
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
