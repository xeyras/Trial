import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from 'discord.js';
import { getSuggestionChannel } from '../utils/suggestionConfig.js';

export default {
    name: 'interactionCreate',
    async execute(interaction) {

        // ── Modal submit ───────────────────────────────────────────────
        if (interaction.isModalSubmit() && interaction.customId === 'suggestion_modal') {
            await interaction.deferReply({ ephemeral: true });

            const title = interaction.fields.getTextInputValue('suggestion_title');
            const body = interaction.fields.getTextInputValue('suggestion_body');
            const guild = interaction.guild;
            const user = interaction.user;

            const channelId = await getSuggestionChannel(guild.id);
            const suggestionChannel = await guild.channels.fetch(channelId).catch(() => null);

            if (!suggestionChannel) {
                return interaction.editReply({
                    content: '❌ Suggestion channel not found. Contact an admin.',
                });
            }

            const suggestionEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`💡 ${title}`)
                .setDescription(body)
                .addFields(
                    { name: '👤 Submitted by', value: `${user} (${user.id})`, inline: true },
                    { name: '📊 Status', value: '⏳ Pending', inline: true },
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: `Suggestion from ${guild.name}` });

            const voteRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setLabel('⬆️ Upvote')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setLabel('⬇️ Downvote')
                    .setStyle(ButtonStyle.Danger),
            );

            const sent = await suggestionChannel.send({
                embeds: [suggestionEmbed],
                components: [voteRow],
            });

            return interaction.editReply({
                content: `✅ Your suggestion has been submitted! Check it out in ${suggestionChannel} (ID: \`${sent.id}\`)`,
            });
        }

        // ── Vote buttons ───────────────────────────────────────────────
        if (interaction.isButton() && (interaction.customId === 'upvote' || interaction.customId === 'downvote')) {
            await interaction.deferUpdate();

            const message = interaction.message;
            const embed = message.embeds[0];
            if (!embed) return;

            const isUpvote = interaction.customId === 'upvote';
            const voteField = isUpvote ? '⬆️ Upvotes' : '⬇️ Downvotes';
            const oppositeField = isUpvote ? '⬇️ Downvotes' : '⬆️ Upvotes';

            const fields = embed.fields ? [...embed.fields] : [];

            // Get or init vote fields
            let upvotes = parseInt(fields.find(f => f.name === '⬆️ Upvotes')?.value || '0');
            let downvotes = parseInt(fields.find(f => f.name === '⬇️ Downvotes')?.value || '0');

            if (isUpvote) upvotes++; else downvotes++;

            // Rebuild fields preserving original ones
            const updatedFields = fields.filter(f =>
                f.name !== '⬆️ Upvotes' && f.name !== '⬇️ Downvotes'
            );

            updatedFields.push(
                { name: '⬆️ Upvotes', value: `${upvotes}`, inline: true },
                { name: '⬇️ Downvotes', value: `${downvotes}`, inline: true },
            );

            const updatedEmbed = EmbedBuilder.from(embed).setFields(updatedFields);

            await message.edit({ embeds: [updatedEmbed], components: message.components });
        }
    },
};
