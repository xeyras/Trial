import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getSuggestionChannel, setSuggestionChannel } from '../../utils/suggestionConfig.js';

export default {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Suggestion system')
        .addSubcommand(sub =>
            sub.setName('idea')
                .setDescription('Submit a suggestion')
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the suggestion channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send suggestions to')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('review')
                .setDescription('Accept or deny a suggestion')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the suggestion')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Accept or deny the suggestion')
                        .setRequired(true)
                        .addChoices(
                            { name: '✅ Accept', value: 'accept' },
                            { name: '❌ Deny', value: 'deny' },
                        )
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for accepting or denying')
                        .setRequired(false)
                )
        ),

    async execute(interaction, guildConfig, client) {
        const sub = interaction.options.getSubcommand();

        // ── /suggest set ───────────────────────────────────────────────
        if (sub === 'set') {
            const channel = interaction.options.getChannel('channel');

            try {
                await setSuggestionChannel(interaction.guild.id, channel.id);
            } catch {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Failed to Save',
                        description: 'Could not save the suggestion channel. Please try again.',
                        color: 'error',
                    })],
                    ephemeral: true,
                });
            }

            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '✅ Suggestion Channel Set',
                    description: `Suggestions will now be sent to ${channel}`,
                    color: 'success',
                })],
                ephemeral: true,
            });
        }

        // ── /suggest idea ──────────────────────────────────────────────
        if (sub === 'idea') {
            const channelId = await getSuggestionChannel(interaction.guild.id);
            if (!channelId) {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Not Configured',
                        description: 'No suggestion channel has been set. Ask an admin to run `/suggest set`.',
                        color: 'error',
                    })],
                    ephemeral: true,
                });
            }

            // Show modal popup
            const modal = new ModalBuilder()
                .setCustomId('suggestion_modal')
                .setTitle('💡 Submit Your Suggestion');

            const titleInput = new TextInputBuilder()
                .setCustomId('suggestion_title')
                .setLabel('Title')
                .setPlaceholder('Short title for your suggestion')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(100)
                .setRequired(true);

            const bodyInput = new TextInputBuilder()
                .setCustomId('suggestion_body')
                .setLabel('Suggestion')
                .setPlaceholder('Describe your suggestion in detail...')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1000)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(bodyInput),
            );

            return interaction.showModal(modal);
        }

        // ── /suggest review ────────────────────────────────────────────
        if (sub === 'review') {
            await InteractionHelper.safeDefer(interaction, { ephemeral: true });

            const messageId = interaction.options.getString('message_id');
            const action = interaction.options.getString('action');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const guild = interaction.guild;

            const channelId = await getSuggestionChannel(guild.id);
            if (!channelId) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Not Configured',
                        description: 'No suggestion channel has been set.',
                        color: 'error',
                    })]
                });
            }

            const suggestionChannel = await guild.channels.fetch(channelId).catch(() => null);
            if (!suggestionChannel) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Channel Not Found',
                        description: 'The suggestion channel no longer exists.',
                        color: 'error',
                    })]
                });
            }

            const message = await suggestionChannel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Message Not Found',
                        description: 'Could not find that suggestion. Make sure the message ID is correct.',
                        color: 'error',
                    })]
                });
            }

            const originalEmbed = message.embeds[0];
            if (!originalEmbed) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Invalid Message',
                        description: 'That message does not appear to be a suggestion.',
                        color: 'error',
                    })]
                });
            }

            const isAccepted = action === 'accept';
            const statusText = isAccepted ? '✅ Accepted' : '❌ Denied';
            const statusColor = isAccepted ? 0x57F287 : 0xED4245;

            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(statusColor)
                .setFooter({
                    text: `${statusText} by ${interaction.user.tag} • Reason: ${reason}`
                })
                .setTimestamp();

            // Disable the vote buttons
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setLabel('⬆️ Upvote')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setLabel('⬇️ Downvote')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true),
            );

            await message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: `${statusText} Successfully`,
                    description: `Suggestion \`${messageId}\` has been ${isAccepted ? 'accepted ✅' : 'denied ❌'}`,
                    color: isAccepted ? 'success' : 'error',
                })]
            });
        }
    },
};
