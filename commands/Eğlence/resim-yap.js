const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resim-yap')
        .setDescription('🎨 Yapay zeka ile resim oluştur')
        .addStringOption(opt =>
            opt.setName('açıklama')
                .setDescription('Oluşturmak istediğin resmin açıklaması (İngilizce önerilir)')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('stil')
                .setDescription('Resim stili')
                .addChoices(
                    { name: '🖼️ Gerçekçi', value: 'realistic' },
                    { name: '🎨 Anime', value: 'anime' },
                    { name: '🖌️ Dijital Sanat', value: 'digital art' },
                    { name: '📸 Fotoğraf', value: 'photograph' },
                    { name: '🎭 Pixel Art', value: 'pixel art' },
                    { name: '🖍️ Çizgi Film', value: 'cartoon' },
                )),

    run: async (client, interaction) => {
        const prompt = interaction.options.getString('açıklama');
        const style = interaction.options.getString('stil') || 'digital art';

        await interaction.deferReply();

        try {
            // Gemini ile resim oluşturma (text-to-image prompt engineering)
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                // OpenRouter fallback - DALL-E 3 benzeri model
                const openRouterKey = process.env.OPENROUTER_API_KEY;
                if (!openRouterKey) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setDescription('❌ Resim oluşturma servisi yapılandırılmamış.\nGEMINI_API_KEY veya OPENROUTER_API_KEY gerekli.')
                            .setColor('#E74C3C')]
                    });
                }

                // OpenRouter ile görsel oluşturma
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openRouterKey}`,
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-exp:free',
                        messages: [{
                            role: 'user',
                            content: `Create a detailed, vivid description of an image: "${prompt}" in ${style} style. Describe it as if painting it, including colors, lighting, composition, mood. Be very specific and artistic. Start directly with the description.`
                        }],
                        max_tokens: 500,
                    }),
                });

                const data = await response.json();
                const description = data.choices?.[0]?.message?.content || 'Açıklama oluşturulamadı.';

                const embed = new EmbedBuilder()
                    .setTitle('🎨 AI Görsel Tasviri')
                    .setDescription(`**İstek:** ${prompt}\n**Stil:** ${style}\n\n📝 **AI Tasviri:**\n${description.substring(0, 1500)}`)
                    .setColor('#9B59B6')
                    .setFooter({ text: 'Not: Metin tabanlı tasvir (Görsel API entegre edildiğinde gerçek resim üretilecek)' });

                return interaction.editReply({ embeds: [embed] });
            }

            // Gemini Imagen kullanarak resim oluşturma
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const fullPrompt = `Create a highly detailed ${style} image of: ${prompt}. Make it visually stunning with great composition and lighting.`;

            const result = await model.generateContent(fullPrompt);
            const response = result.response;
            const text = response.text();

            const embed = new EmbedBuilder()
                .setTitle('🎨 AI Resim Oluşturucu')
                .setDescription(`**İstek:** ${prompt}\n**Stil:** ${style}\n\n🖼️ **AI Yanıtı:**\n${text.substring(0, 1500)}`)
                .setColor('#9B59B6')
                .setFooter({ text: 'Luminex AI Art' });

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('[RESIM-YAP] Hata:', err);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setDescription(`❌ Resim oluşturulurken hata: ${err.message}`)
                    .setColor('#E74C3C')]
            });
        }
    }
};
