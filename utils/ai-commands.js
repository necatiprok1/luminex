const moderation = require('./ai_commands/moderation');
const utility = require('./ai_commands/utility');
const analysis = require('./ai_commands/analysis');
const system = require('./ai_commands/system');

async function executeAICommand(commandData, message, client) {
    const command = commandData.command || commandData.action;
    const params = commandData.params || commandData.args || [];
    const guild = message.guild;

    console.log(`[ROUTER] Komut: ${command} | Parametreler: ${params.join(', ') || 'Yok'}`);

    // Modülleri sırayla dene
    let result = await moderation.execute(guild, message, command, params, client);
    if (result) return result;

    result = await utility.execute(guild, message, command, params, client);
    if (result) return result;

    result = await analysis.execute(guild, message, command, params, client);
    if (result) return result;

    result = await system.execute(guild, message, command, params, client);
    if (result) return result;

    return { success: false, message: '❌ Komut işlenemedi veya bulunamadı.' };
}

module.exports = { executeAICommand };
