/**
 * Voice Channel Management API Routes
 * Handles creation, deletion, editing, and listing of voice channels
 */

const { body, validationResult } = require('express-validator');
const { ChannelType } = require('discord.js');

module.exports = (client, ensureAuthenticated, checkGuildAdmin) => {
    return {
        // GET /api/server/:id/voice-channels - List all voice channels
        getVoiceChannels: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const guild = req.guild;
                    
                    // Get all voice channels
                    const voiceChannels = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice);

                    // Voice channel üyeleri çoğu zaman cache'te tam dolu olmaz.
                    // Bu yüzden mevcut üyeleri çekip (fetch) hem sayıyı hem de bir preview'ı döndürüyoruz.
                    const data = await Promise.all(
                        voiceChannels.map(async (ch) => {
                            let membersCollection = null;
                            try {
                                membersCollection = await ch.members.fetch();
                            } catch (e) {
                                // Fallback: mevcut cache ile devam et
                                membersCollection = ch.members.cache;
                            }

                            const membersArr = [...membersCollection.values()];
                            const membersCount = membersCollection?.size ?? membersArr.length;

                            const membersPreview = membersArr
                                .slice(0, 10)
                                .map(m => {
                                    const user = m.user;
                                    return {
                                        id: m.id,
                                        tag: user?.tag,
                                        username: user?.username,
                                        displayName: m.displayName
                                    };
                                });

                            return {
                                id: ch.id,
                                name: ch.name,
                                bitrate: ch.bitrate,
                                userLimit: ch.userLimit,
                                parentId: ch.parentId,
                                position: ch.position,
                                membersCount,
                                members: membersPreview,
                                createdAt: ch.createdAt
                            };
                        })
                    );

                    res.json({
                        success: true,
                        data,
                        count: data.length
                    });
                } catch (error) {
                    console.error('[VOICE] List error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Ses kanalları listelenirken hata oluştu'
                    });
                }
            }
        ],

        // POST /api/server/:id/voice-channels - Create new voice channel
        createVoiceChannel: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('name').trim().notEmpty().withMessage('Kanal adı gerekli'),
                body('bitrate').optional().isInt({ min: 8000, max: 128000 }).withMessage('Bitrate 8000-128000 arasında olmalı'),
                body('userLimit').optional().isInt({ min: 0, max: 99 }).withMessage('Kullanıcı limiti 0-99 arasında olmalı')
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { name, bitrate, userLimit, parentId } = req.body;
                    const guild = req.guild;

                    // Create channel
                    const channel = await guild.channels.create({
                        name: name,
                        type: ChannelType.GuildVoice,
                        bitrate: bitrate || 64000,
                        userLimit: userLimit || 0,
                        parent: parentId || null
                    });

                    console.log(`[VOICE] Channel created: ${channel.name} (${channel.id}) in guild ${guild.id}`);

                    res.json({
                        success: true,
                        message: `Ses kanalı "${channel.name}" oluşturuldu`,
                        data: {
                            id: channel.id,
                            name: channel.name,
                            bitrate: channel.bitrate,
                            userLimit: channel.userLimit
                        }
                    });
                } catch (error) {
                    console.error('[VOICE] Create error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Ses kanalı oluşturulurken hata: ' + error.message
                    });
                }
            }
        ],

        // PATCH /api/server/:id/voice-channels/:channelId - Update voice channel
        updateVoiceChannel: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('name').optional().trim().notEmpty(),
                body('bitrate').optional().isInt({ min: 8000, max: 128000 }),
                body('userLimit').optional().isInt({ min: 0, max: 99 })
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { channelId } = req.params;
                    const { name, bitrate, userLimit } = req.body;
                    const guild = req.guild;

                    const channel = guild.channels.cache.get(channelId);
                    if (!channel || channel.type !== ChannelType.GuildVoice) {
                        return res.status(404).json({
                            success: false,
                            error: 'Ses kanalı bulunamadı'
                        });
                    }

                    // Update channel properties
                    const updates = {};
                    if (name) updates.name = name;
                    if (bitrate) updates.bitrate = bitrate;
                    if (userLimit !== undefined) updates.userLimit = userLimit;

                    await channel.edit(updates);

                    console.log(`[VOICE] Channel updated: ${channel.name} (${channel.id}) in guild ${guild.id}`);

                    res.json({
                        success: true,
                        message: `Ses kanalı "${channel.name}" güncellendi`,
                        data: {
                            id: channel.id,
                            name: channel.name,
                            bitrate: channel.bitrate,
                            userLimit: channel.userLimit
                        }
                    });
                } catch (error) {
                    console.error('[VOICE] Update error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Ses kanalı güncellenirken hata: ' + error.message
                    });
                }
            }
        ],

        // DELETE /api/server/:id/voice-channels/:channelId - Delete voice channel
        deleteVoiceChannel: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { channelId } = req.params;
                    const guild = req.guild;

                    const channel = guild.channels.cache.get(channelId);
                    if (!channel || channel.type !== ChannelType.GuildVoice) {
                        return res.status(404).json({
                            success: false,
                            error: 'Ses kanalı bulunamadı'
                        });
                    }

                    const channelName = channel.name;
                    await channel.delete();

                    console.log(`[VOICE] Channel deleted: ${channelName} (${channelId}) in guild ${guild.id}`);

                    res.json({
                        success: true,
                        message: `Ses kanalı "${channelName}" silindi`
                    });
                } catch (error) {
                    console.error('[VOICE] Delete error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Ses kanalı silinirken hata: ' + error.message
                    });
                }
            }
        ]
    };
};
