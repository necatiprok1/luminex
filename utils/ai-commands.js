const moderation = require('./ai_commands/moderation');
const utility = require('./ai_commands/utility');
const analysis = require('./ai_commands/analysis');
const system = require('./ai_commands/system');
const { validateCommand, getCommandHelp } = require('./ai_commands/registry');

async function executeAICommand(commandData, message, client) {
    const command = commandData.command || commandData.action;
    const params = commandData.params || commandData.args || [];
    const guild = message.guild;

    console.log(`[ROUTER] 🚀 Komut: ${command} | Parametreler: ${params.join(', ') || 'Yok'}`);
    console.log(`[ROUTER] 📋 Guild: ${guild?.name}, Message: ${message?.id}`);

    // Phase 5: Registry validation
    const validation = validateCommand(command, params);
    if (!validation.valid) {
        console.log(`[ROUTER] ❌ Validasyon hatası: ${validation.error}`);
        return { success: false, message: `❌ ${validation.error}` };
    }

    // Modülleri sırayla dene
    console.log(`[ROUTER] 🔄 Moderation modülü deneniyor...`);
    let result = await moderation.execute(guild, message, command, params, client);
    if (result) {
        console.log(`[ROUTER] ✅ Moderation sonuç:`, result);
        return result;
    }

    console.log(`[ROUTER] 🔄 Utility modülü deneniyor...`);
    result = await utility.execute(guild, message, command, params, client);
    if (result) {
        console.log(`[ROUTER] ✅ Utility sonuç:`, result);
        return result;
    }

    console.log(`[ROUTER] 🔄 Analysis modülü deneniyor...`);
    result = await analysis.execute(guild, message, command, params, client);
    if (result) {
        console.log(`[ROUTER] ✅ Analysis sonuç:`, result);
        return result;
    }

    console.log(`[ROUTER] 🔄 System modülü deneniyor...`);
    result = await system.execute(guild, message, command, params, client);
    if (result) {
        console.log(`[ROUTER] ✅ System sonuç:`, result);
        return result;
    }

    console.log(`[ROUTER] ❌ Hiçbir modül komutu işlemedi`);
    return { success: false, message: '❌ Komut işlenemedi veya bulunamadı.' };
}

module.exports = { executeAICommand };
