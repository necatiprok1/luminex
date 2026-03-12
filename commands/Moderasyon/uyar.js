const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("croxydb");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uyar")
        .setDescription("⚠️ Bir kullanıcıyı uyar.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Uyarılacak kullanıcı")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("sebep")
                .setDescription("Uyarı sebebi")
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser("kullanıcı");
        const reason = interaction.options.getString("sebep");
        const guildId = interaction.guild.id;

        if (targetUser.bot) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ Botları uyaramazsın!')],
                ephemeral: true
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ Kendini uyaramazsın!')],
                ephemeral: true
            });
        }

        // Uyarı kaydet
        const warningKey = `warnings_${guildId}_${targetUser.id}`;
        let warnings = db.fetch(warningKey) || [];

        const newWarning = {
            id: warnings.length + 1,
            moderator: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            date: Date.now()
        };

        warnings.push(newWarning);
        db.set(warningKey, warnings);

        const totalWarnings = warnings.length;

        // Otomatik ceza
        let punishment = '';
        const member = interaction.guild.members.cache.get(targetUser.id) ||
            await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (totalWarnings >= 5 && member) {
            try {
                await member.kick(`5 uyarı - Otomatik ceza`);
                punishment = '\n\n🚫 **5. uyarıya ulaştı — Otomatik KICK uygulandı!**';
            } catch (e) {
                punishment = '\n\n⚠️ *Kick uygulanamadı (yetki eksik)*';
            }
        } else if (totalWarnings >= 3 && member) {
            try {
                await member.timeout(3600000, `3 uyarı - Otomatik ceza`); // 1 saat
                punishment = '\n\n⏰ **3. uyarıya ulaştı — 1 saat TIMEOUT uygulandı!**';
            } catch (e) {
                punishment = '\n\n⚠️ *Timeout uygulanamadı (yetki eksik)*';
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `${targetUser} uyarıldı!\n\n` +
                `📝 **Sebep:** ${reason}\n` +
                `🔢 **Toplam Uyarı:** \`${totalWarnings}/5\`\n` +
                `👮 **Moderatör:** ${interaction.user}` +
                punishment
            )
            .setFooter({ text: `3 uyarı = Timeout | 5 uyarı = Kick` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log
        try {
            const logSystem = require('../../utils/log-system');
            await logSystem.logModeration(interaction.guild, 'warn', interaction.user, targetUser, reason);
        } catch (e) { }

        // DM bildirim
        try {
            await targetUser.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle(`⚠️ ${interaction.guild.name} — Uyarı`)
                        .setDescription(`**Sebep:** ${reason}\n**Toplam Uyarı:** ${totalWarnings}/5`)
                        .setTimestamp()
                ]
            });
        } catch (e) { }
    }
};
