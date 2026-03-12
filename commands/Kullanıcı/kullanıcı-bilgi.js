const { Client, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const emojis = require("../../utils/emojis");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanıcı-bilgi')
        .setDescription('👤 Bir kullanıcının detaylı bilgilerini gösterir')
        .addUserOption(option =>
            option
                .setName('kullanıcı')
                .setDescription('Bilgilerini görmek istediğiniz kullanıcı')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const member = interaction.options.getMember('kullanıcı');
        const highestRole = member.roles.highest.name;
        const roles = member.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .map(role => role.toString())
            .slice(0, 10)
            .join(', ') || 'Rol yok';

        const permissions = new PermissionsBitField(member.permissions.bitfield);
        const isTrusted = member.roles.cache.some(r => r.name === 'Güvenilir');
        const status = member.presence?.status || 'offline';

        const statusConfig = {
            'online': { emoji: '🟢', text: 'Çevrimiçi', color: '#57F287' },
            'idle': { emoji: '🟡', text: 'Boşta', color: '#FEE75C' },
            'dnd': { emoji: '🔴', text: 'Rahatsız Etmeyin', color: '#ED4245' },
            'offline': { emoji: '⚫', text: 'Çevrimdışı', color: '#747F8D' }
        };

        const currentStatus = statusConfig[status] || statusConfig.offline;

        // Rozet/Badge kontrolü
        const badges = [];
        const userFlags = member.user.flags?.toArray() || [];
        const badgeMap = {
            'Staff': '<:staff:1234567890> Discord Çalışanı',
            'Partner': '<:partner:1234567890> Partner',
            'Hypesquad': '<:hypesquad:1234567890> HypeSquad Events',
            'BugHunterLevel1': '<:bughunter:1234567890> Bug Hunter',
            'HypeSquadOnlineHouse1': '🏠 Bravery',
            'HypeSquadOnlineHouse2': '🏠 Brilliance',
            'HypeSquadOnlineHouse3': '🏠 Balance',
            'PremiumEarlySupporter': '👑 Erken Destekçi',
            'VerifiedDeveloper': '👨‍💻 Doğrulanmış Geliştirici',
            'ActiveDeveloper': '🔨 Aktif Geliştirici'
        };

        userFlags.forEach(flag => {
            if (badgeMap[flag]) badges.push(badgeMap[flag]);
        });

        const embed = new EmbedBuilder()
            .setColor(currentStatus.color)
            .setAuthor({
                name: `${member.user.tag}`,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(`
${emojis.decorations.starLine}

${currentStatus.emoji} **${currentStatus.text}**

${emojis.decorations.starLine}
            `)
            .addFields(
                {
                    name: `${emojis.static.user} Kullanıcı Bilgisi`,
                    value: `
${emojis.decorations.bullet} **Etiket:** ${member.user.tag}
${emojis.decorations.bullet} **ID:** \`${member.user.id}\`
${emojis.decorations.bullet} **Bot:** ${member.user.bot ? 'Evet 🤖' : 'Hayır 👤'}
                    `,
                    inline: true
                },
                {
                    name: `${emojis.static.calendar || '📅'} Tarihler`,
                    value: `
${emojis.decorations.bullet} **Hesap:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>
${emojis.decorations.bullet} **Katılım:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>
                    `,
                    inline: true
                },
                {
                    name: `${emojis.static.shield} Roller`,
                    value: `
${emojis.decorations.bullet} **En Yüksek:** ${member.roles.highest}
${emojis.decorations.bullet} **Toplam:** ${member.roles.cache.size - 1}
                    `,
                    inline: false
                }
            )
            .setFooter({
                text: `${isTrusted ? '✅ Güvenilir Üye' : '⏳ Normal Üye'} • ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        if (badges.length > 0) {
            embed.addFields({
                name: `${emojis.static.trophy || '🏆'} Rozetler`,
                value: badges.join('\n'),
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};
