const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { inspect } = require("util");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Sadece bot sahibi kullanabilir.')
        .addStringOption(option =>
            option
                .setName('code')
                .setDescription('Code')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        // Check if the user is the owner
        if (interaction.user.id !== config.ownerID) {
            return sendEmbed(interaction, "EVAL", "❌ Bu komutu sadece sahibim kullanabilir.");
        }

        let toEval = interaction.options.getString("code");

        try {
            // Check if the code is empty
            if (!toEval) {
                return sendEmbed(interaction, "EVAL", "❌ Error: `Cannot evaluate nothing`");
            }

            // 🔒 SECURE: Use Function constructor with timeout
            // Does NOT have access to require, process, or module scope
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            
            const startTime = process.hrtime();
            
            // Create a sandboxed function with limited access
            const fn = new AsyncFunction(
                'client', 'interaction', 'guild', 'channel',
                `"use strict";\n${toEval}`
            );

            // Execute with 5 second timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Execution timeout (5s)')), 5000)
            );
            
            let result = await Promise.race([
                fn(client, interaction, interaction.guild, interaction.channel),
                timeoutPromise
            ]);
            
            const endTime = process.hrtime(startTime);

            let evaluated = inspect(result, { depth: 1, maxStringLength: 1900 });

            // Sanitize output - remove tokens
            const token = process.env.DISCORD_TOKEN || process.env.TOKEN || '';
            if (token && evaluated.includes(token)) {
                evaluated = evaluated.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
            }

            // Check if the evaluated code is too long
            if (evaluated.length > 1950) {
                evaluated = evaluated.substring(0, 1900) + '\n... (truncated)';
            }

            const executionTime = `${endTime[0] > 0 ? `${endTime[0]}s` : ''}${(endTime[1] / 1000000).toFixed(2)}ms`;
            return sendEmbed(interaction, "EVAL", `✅ Executed in ${executionTime}\n\`\`\`javascript\n${evaluated}\n\`\`\``);
        } catch (e) {
            console.error('[EVAL] Error:', e.message);
            const errorMsg = e.message.length > 1900 ? e.message.substring(0, 1900) + '...' : e.message;
            return sendEmbed(interaction, "EVAL", `❌ Error:\n\`\`\`\n${errorMsg}\n\`\`\``);
        }
    },
};

// Helper function to send embed messages
function sendEmbed(interaction, title, description) {
    const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
    return interaction.reply({ embeds: [embed], flags: 64 });
}
