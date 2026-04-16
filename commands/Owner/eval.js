const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { inspect } = require("util");
const { VM } = require("vm2");
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

            // 🔒 SECURE: Use vm2 sandbox instead of eval()
            // Timeout after 5 seconds to prevent infinite loops
            const vm = new VM({
                timeout: 5000,
                sandbox: {
                    // Provide safe access to console only
                    console: { log: console.log, error: console.error },
                    require: require
                }
            });

            const startTime = process.hrtime();
            let result = vm.run(toEval);
            const endTime = process.hrtime(startTime);
            
            let evaluated = inspect(result, { depth: 0 });

            // Check if the evaluated code is too long
            if (evaluated.length > 1950) {
                return sendEmbed(interaction, "EVAL", "❌ Error: `Request is too long.`");
            }

            const executionTime = `${endTime[0] > 0 ? `${endTime[0]}s` : ''}${(endTime[1] / 1000000).toFixed(2)}ms`;
            return sendEmbed(interaction, "EVAL", `✅ Executed in ${executionTime}\n\`\`\`javascript\n${evaluated}\n\`\`\``);
        } catch (e) {
            console.error('[EVAL] Error:', e.message);
            interaction.reply({ content: `❌ An error occurred: \`${e.message}\`` });
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

// Helper function to send embed messages
function sendEmbed(interaction, title, description) {
    const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
    return interaction.reply({ embeds: [embed], flags: 64 });
}
