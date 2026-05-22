/**
 * 📄 PDF Upload Command
 * /knowledge-upload komutı ile PDF dosyaları yükler ve embed eder
 */

const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const chalk = require('chalk');
const embeddingService = require('../../utils/embedding-service');
const { KnowledgeBase, LearningStats } = require('../../models/GuildMemory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('knowledge-upload')
        .setDescription('📚 PDF dosyasını bilgi tabanına yükle')
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Yüklenecek PDF dosyası')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Dosya açıklaması (opsiyonel)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    /**
     * Command execute function
     */
    run: async (client, interaction) => {
        // Deferred reply (zaman alabilir)
        await interaction.deferReply();

        try {
            const file = interaction.options.getAttachment('file');
            const description = interaction.options.getString('description') || '';

            // Dosya validasyonu
            if (!file.url.endsWith('.pdf')) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF6B6B)
                            .setTitle('❌ Geçersiz Dosya Türü')
                            .setDescription('Lütfen bir PDF dosyası yükleyin.')
                            .setTimestamp()
                    ]
                });
            }

            // Dosya boyutu kontrolü (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF6B6B)
                            .setTitle('❌ Dosya Çok Büyük')
                            .setDescription('Maksimum 10MB boyutunda dosya yüklenebilir.')
                            .setTimestamp()
                    ]
                });
            }

            // Dosyayı indir
            console.log(chalk.blue(`[UPLOAD] 📥 Downloading PDF: ${file.name}`));
            const pdfBuffer = await axios.get(file.url, { responseType: 'arraybuffer' }).then(r => r.data);

            // PDF'i parse et
            console.log(chalk.blue(`[UPLOAD] 📖 Parsing PDF: ${file.name}`));
            const pdfData = await pdfParse(pdfBuffer);

            if (!pdfData.text || pdfData.text.length < 100) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF6B6B)
                            .setTitle('❌ PDF Boş veya Geçersiz')
                            .setDescription('PDF dosyasından metin çıkarılamadı.')
                            .setTimestamp()
                    ]
                });
            }

            // Metni chunks'a böl (512 tokens ~2000 characters)
            const chunks = module.exports.splitIntoChunks(pdfData.text, 2000);
            console.log(chalk.cyan(`[UPLOAD] ✂️ Split into ${chunks.length} chunks`));

            // Chunks'ları embed et ve kaydet
            let successCount = 0;
            let errorCount = 0;

            // Bundle olacak embed işlemlerini başlat
            const embedResults = await embeddingService.embedBatch(chunks);

            for (let idx = 0; idx < embedResults.length; idx++) {
                const result = embedResults[idx];

                if (result.error) {
                    errorCount++;
                    console.error(chalk.red(`[UPLOAD] ❌ Chunk ${idx + 1} embedding failed: ${result.error}`));
                    continue;
                }

                try {
                    // KnowledgeBase'ye kaydet
                    const doc = new KnowledgeBase({
                        guildId: interaction.guildId,
                        title: `${file.name.replace('.pdf', '')} - Part ${idx + 1}`,
                        content: result.text,
                        embedding: result.embedding,
                        source: 'pdf',
                        chunkIndex: idx,
                        metadata: {
                            fileName: file.name,
                            uploadedBy: interaction.user.id,
                            fileSize: file.size,
                            description: description,
                            language: 'tr',
                            uploadTimestamp: new Date()
                        }
                    });

                    await doc.save();
                    successCount++;

                } catch (dbError) {
                    errorCount++;
                    console.error(chalk.red(`[UPLOAD] ❌ Database save failed for chunk ${idx + 1}: ${dbError.message}`));
                }
            }

            // Learning stats'ı güncelle
            await LearningStats.updateOne(
                { guildId: interaction.guildId },
                { $inc: { totalDocumentsIngested: successCount } },
                { upsert: true }
            );

            // Success embed
            const embed = new EmbedBuilder()
                .setColor(0x4ECDC4)
                .setTitle('✅ PDF Başarıyla Yüklendi')
                .addFields(
                    {
                        name: '📄 Dosya Adı',
                        value: file.name,
                        inline: true
                    },
                    {
                        name: '📊 Toplam Chunks',
                        value: `${chunks.length}`,
                        inline: true
                    },
                    {
                        name: '✨ Başarıyla Kaydedilen',
                        value: `${successCount} / ${chunks.length}`,
                        inline: true
                    },
                    {
                        name: '⚙️ İşlem Detayları',
                        value: `Dosya Boyutu: ${(file.size / 1024).toFixed(2)} KB\nSayfa Sayısı: ${pdfData.numpages || 'Bilinmiyor'}`,
                        inline: false
                    }
                )
                .setFooter({ text: 'Belge bilgi tabanına başarıyla eklendi' })
                .setTimestamp();

            if (errorCount > 0) {
                embed.addFields({
                    name: '⚠️ Hatalar',
                    value: `${errorCount} chunk embedding başarısız oldu (geçildi)`,
                    inline: false
                });
            }

            console.log(chalk.green(`[UPLOAD] ✅ Upload complete: ${successCount}/${chunks.length} chunks saved`));

            return await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(chalk.red(`[UPLOAD] ❌ Command error: ${error.message}`));

            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF6B6B)
                        .setTitle('❌ Yükleme Başarısız')
                        .setDescription(`Hata: ${error.message}`)
                        .setTimestamp()
                ]
            });
        }
    },

    /**
     * Metin parçalarına böl (chunks)
     * @private
     */
    splitIntoChunks(text, chunkSize = 2000) {
        const chunks = [];
        let currentChunk = '';

        const sentences = text.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks.filter(chunk => chunk.length >= 50); // Minimum chunk size
    }
};
