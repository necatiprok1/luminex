const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("croxydb");
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

            let evaluated = inspect(eval(toEval, { depth: 0 }));

            // Check if the evaluated code is too long
            if (evaluated.length > 1950) {
                return sendEmbed(interaction, "EVAL", "❌ Error: `Request is too long.`");
            }

            let hrDiff = process.hrtime(process.hrtime());
            return sendEmbed(interaction, "EVAL", `Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s` : ''}${hrDiff[1] / 1000000}ms.*\`\`\`javascript\n${evaluated}\n\`\`\``);
        } catch (e) {
            interaction.reply({ content: `An error occurred : \`${e.message}\`` });
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
    return interaction.reply({ embeds: [embed], ephemeral: true });
}
