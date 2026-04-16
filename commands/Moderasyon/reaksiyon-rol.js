const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../utils/mongodb-helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reaksiyon-rol')
        .setDescription('🎭 Reaksiyon rol sistemi ayarla')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Bir mesaja reaksiyon rol ekle')
                .addStringOption(opt =>
                    opt.setName('mesaj-id')
                        .setDescription('Mesaj ID\'si')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('emoji')
                        .setDescription('Emoji (örn: 🎮 veya custom emoji)')
                        .setRequired(true))
                .addRoleOption(opt =>
                    opt.setName('rol')
                        .setDescription('Verilecek rol')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('kaldır')
                .setDescription('Bir reaksiyon rolü kaldır')
                .addStringOption(opt =>
                    opt.setName('mesaj-id')
                        .setDescription('Mesaj ID\'si')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('emoji')
                        .setDescription('Kaldırılacak emoji')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Aktif reaksiyon rolleri listele'))
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Otomatik rol seçim paneli oluştur')
                .addStringOption(opt =>
                    opt.setName('başlık')
                        .setDescription('Panel başlığı')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('roller')
                        .setDescription('emoji1=@rol1,emoji2=@rol2 formatında')
                        .setRequired(true))),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'ekle') {
            const messageId = interaction.options.getString('mesaj-id');
            const emoji = interaction.options.getString('emoji').trim();
            const role = interaction.options.getRole('rol');

            // Mesajı bul ve reaksiyon ekle
            try {
                const message = await interaction.channel.messages.fetch(messageId);
                await message.react(emoji);

                // Kaydet
                const key = `rr_${guildId}_${messageId}`;
                const existing = (await db.fetch(key)) || {};
                existing[emoji] = role.id;
                await db.set(key, existing);

                // Mesaj ID'sini listeye ekle
                const listKey = `rr_messages_${guildId}`;
                const list = (await db.fetch(listKey)) || [];
                if (!list.includes(messageId)) {
                    list.push(messageId);
                    await db.set(listKey, list);
                }

                const embed = new EmbedBuilder()
                    .setDescription(`✅ Reaksiyon rol eklendi!\n\n${emoji} → ${role}\n📌 Mesaj: [Tıkla](${message.url})`)
                    .setColor('#2ECC71');

                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                await interaction.reply({ content: `❌ Hata: ${err.message}`, flags: 64 });
            }
        }

        else if (sub === 'kaldır') {
            const messageId = interaction.options.getString('mesaj-id');
            const emoji = interaction.options.getString('emoji').trim();

            const key = `rr_${guildId}_${messageId}`;
            const existing = (await db.fetch(key)) || {};
            delete existing[emoji];
            await db.set(key, existing);

            await interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`✅ ${emoji} reaksiyon rolü kaldırıldı.`).setColor('#E74C3C')],
                flags: 64
            });
        }

        else if (sub === 'liste') {
            const listKey = `rr_messages_${guildId}`;
            const messages = (await db.fetch(listKey)) || [];

            if (messages.length === 0) {
                return interaction.reply({ content: '📭 Aktif reaksiyon rol bulunamadı.', flags: 64 });
            }

            let desc = '';
            for (const msgId of messages) {
                const data = (await db.fetch(`rr_${guildId}_${msgId}`)) || {};
                const pairs = Object.entries(data).map(([emoji, roleId]) => `${emoji} → <@&${roleId}>`).join(', ');
                if (pairs) desc += `**Mesaj:** \`${msgId}\`\n${pairs}\n\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎭 Reaksiyon Rolleri')
                .setDescription(desc || 'Veri bulunamadı.')
                .setColor('#5865F2');

            await interaction.reply({ embeds: [embed], flags: 64 });
        }

        else if (sub === 'panel') {
            const title = interaction.options.getString('başlık');
            const rollerStr = interaction.options.getString('roller');

            const pairs = rollerStr.split(',').map(p => p.trim());
            let desc = '';
            const rrData = {};

            for (const pair of pairs) {
                const [emoji, roleMention] = pair.split('=');
                if (!emoji || !roleMention) continue;
                const roleId = roleMention.replace(/[<@&>]/g, '');
                rrData[emoji.trim()] = roleId;
                desc += `${emoji.trim()} — <@&${roleId}>\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎭 ${title}`)
                .setDescription(`Aşağıdaki emojilere tıklayarak rol alabilirsiniz:\n\n${desc}`)
                .setColor('#5865F2')
                .setFooter({ text: 'Reaksiyonu kaldırarak rolü geri bırakabilirsiniz.' });

            const panelMsg = await interaction.channel.send({ embeds: [embed] });

            // Reaksiyonları ekle
            for (const emoji of Object.keys(rrData)) {
                try {
                    await panelMsg.react(emoji);
                } catch {}
            }

            // Kaydet
            await db.set(`rr_${guildId}_${panelMsg.id}`, rrData);
            const list = (await db.fetch(`rr_messages_${guildId}`)) || [];
            list.push(panelMsg.id);
            await db.set(`rr_messages_${guildId}`, list);

            await interaction.reply({ content: '✅ Rol paneli oluşturuldu!', flags: 64 });
        }
    }
};
