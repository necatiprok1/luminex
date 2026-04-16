/**
 * Bot Commands Management API Routes
 * Handles creation, deletion, editing of custom bot commands
 */

const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// MongoDB custom commands schema
const CustomCommandSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    response: { type: String, required: true },
    description: String,
    prefix: { type: String, default: '!' },
    enabled: { type: Boolean, default: true },
    permissions: [String], // ['SEND_MESSAGES', 'MANAGE_MESSAGES', etc]
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index for guild and command name
CustomCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Get or create model
let CustomCommand;
try {
    CustomCommand = mongoose.model('CustomCommand');
} catch {
    CustomCommand = mongoose.model('CustomCommand', CustomCommandSchema);
}

module.exports = (client, ensureAuthenticated, checkGuildAdmin) => {
    return {
        // GET /api/server/:id/commands - List all custom commands
        getCommands: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const guild = req.guild;
                    const { limit = 50, offset = 0 } = req.query;

                    const commands = await CustomCommand.find({ guildId: guild.id })
                        .sort({ createdAt: -1 })
                        .limit(parseInt(limit))
                        .skip(parseInt(offset));

                    const total = await CustomCommand.countDocuments({ guildId: guild.id });

                    res.json({
                        success: true,
                        data: commands,
                        count: commands.length,
                        total: total
                    });
                } catch (error) {
                    console.error('[CMD] List error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Komutlar listelenirken hata: ' + error.message
                    });
                }
            }
        ],

        // POST /api/server/:id/commands - Create new command
        createCommand: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('name').trim().notEmpty().matches(/^[a-zA-Z0-9_-]{1,32}$/).withMessage('Komut adı 1-32 karakter, alfanümerik olmalı'),
                body('response').trim().notEmpty().isLength({ max: 2000 }).withMessage('Cevap 2000 karakterde az olmalı'),
                body('description').optional().trim().isLength({ max: 512 }),
                body('prefix').optional().default('!'),
                body('permissions').optional().isArray()
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { name, response, description, prefix, permissions } = req.body;
                    const guild = req.guild;

                    // Check if command already exists
                    const existing = await CustomCommand.findOne({ guildId: guild.id, name });
                    if (existing) {
                        return res.status(409).json({
                            success: false,
                            error: `"${name}" komutu zaten mevcut`
                        });
                    }

                    const command = new CustomCommand({
                        guildId: guild.id,
                        name,
                        response,
                        description,
                        prefix,
                        permissions: permissions || [],
                        createdBy: req.session.userId
                    });

                    await command.save();

                    console.log(`[CMD] Custom command created: ${name} in guild ${guild.id} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `"${name}" komutu oluşturuldu`,
                        data: command
                    });
                } catch (error) {
                    console.error('[CMD] Create error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Komut oluşturulurken hata: ' + error.message
                    });
                }
            }
        ],

        // PATCH /api/server/:id/commands/:commandId - Update command
        updateCommand: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            [
                body('name').optional().trim().matches(/^[a-zA-Z0-9_-]{1,32}$/),
                body('response').optional().trim().isLength({ max: 2000 }),
                body('description').optional().trim().isLength({ max: 512 }),
                body('enabled').optional().isBoolean(),
                body('permissions').optional().isArray()
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ success: false, errors: errors.array() });
                    }

                    const { commandId } = req.params;
                    const { name, response, description, enabled, permissions } = req.body;
                    const guild = req.guild;

                    const command = await CustomCommand.findOne({ guildId: guild.id, _id: commandId });
                    if (!command) {
                        return res.status(404).json({
                            success: false,
                            error: 'Komut bulunamadı'
                        });
                    }

                    // Check if new name already exists
                    if (name && name !== command.name) {
                        const existing = await CustomCommand.findOne({ guildId: guild.id, name });
                        if (existing) {
                            return res.status(409).json({
                                success: false,
                                error: `"${name}" komutu zaten mevcut`
                            });
                        }
                        command.name = name;
                    }

                    if (response) command.response = response;
                    if (description !== undefined) command.description = description;
                    if (enabled !== undefined) command.enabled = enabled;
                    if (permissions) command.permissions = permissions;
                    command.updatedAt = new Date();

                    await command.save();

                    console.log(`[CMD] Custom command updated: ${command.name} in guild ${guild.id} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `"${command.name}" komutu güncellendi`,
                        data: command
                    });
                } catch (error) {
                    console.error('[CMD] Update error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Komut güncellenirken hata: ' + error.message
                    });
                }
            }
        ],

        // DELETE /api/server/:id/commands/:commandId - Delete command
        deleteCommand: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { commandId } = req.params;
                    const guild = req.guild;

                    const command = await CustomCommand.findOne({ guildId: guild.id, _id: commandId });
                    if (!command) {
                        return res.status(404).json({
                            success: false,
                            error: 'Komut bulunamadı'
                        });
                    }

                    const commandName = command.name;
                    await CustomCommand.deleteOne({ _id: commandId });

                    console.log(`[CMD] Custom command deleted: ${commandName} from guild ${guild.id} by ${req.session.username}`);

                    res.json({
                        success: true,
                        message: `"${commandName}" komutu silindi`
                    });
                } catch (error) {
                    console.error('[CMD] Delete error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Komut silinirken hata: ' + error.message
                    });
                }
            }
        ],

        // GET /api/server/:id/commands/:commandId - Get single command
        getCommand: [
            ensureAuthenticated,
            checkGuildAdmin(client),
            async (req, res) => {
                try {
                    const { commandId } = req.params;
                    const guild = req.guild;

                    const command = await CustomCommand.findOne({ guildId: guild.id, _id: commandId });
                    if (!command) {
                        return res.status(404).json({
                            success: false,
                            error: 'Komut bulunamadı'
                        });
                    }

                    res.json({
                        success: true,
                        data: command
                    });
                } catch (error) {
                    console.error('[CMD] Get error:', error.message);
                    res.status(500).json({
                        success: false,
                        error: 'Komut getirilirken hata: ' + error.message
                    });
                }
            }
        ]
    };
};
