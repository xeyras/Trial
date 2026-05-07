import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a muted user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for unmuting the user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // ── Permission checks ──────────────────────────────────────────
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Missing Permissions',
                    description: 'You need the **Moderate Members** permission to unmute users.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        if (!target) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ User Not Found',
                    description: 'That user could not be found in this server.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        if (!target.moderatable) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Cannot Unmute User',
                    description: 'I cannot unmute this user. They may have a higher role than me.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        // ── Check if user is actually muted ────────────────────────────
        if (!target.isCommunicationDisabled()) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Not Muted',
                    description: `${target.user.tag} is not currently muted, you bully <:ohreeee:1406787354081103953>.`,
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        // ── Remove timeout ─────────────────────────────────────────────
        try {
            await target.timeout(null, reason);

            const successEmbed = createEmbed({
                title: '🔊 User Unmuted! now yapp bro!',
                color: 'success'
            });

            successEmbed.addFields(
                { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: '🔨 Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            );

            successEmbed.setTimestamp();

            await InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed]
            });

        } catch (error) {
            console.error('[UNMUTE] Error:', error);
            await InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Unmute Failed',
                    description: 'Something went wrong while trying to unmute the user.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }
    },
};
