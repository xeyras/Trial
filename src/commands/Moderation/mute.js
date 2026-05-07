import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user for a specified duration')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration (e.g. 10s, 5m, 2h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for muting the user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // ── Permission checks ──────────────────────────────────────────
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Missing Permissions breh',
                    description: 'You need the **Moderate Members** permission to mute users!!.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        if (!target) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ User Not Found',
                    description: 'You trying to mute a ghost??.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        if (!target.moderatable) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Cannot Mute User',
                    description: 'I cannot mute this user. They may have a higher role than me 😔',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Invalid Target',
                    description: 'You cannot mute yourself 😂!',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        // ── Parse duration ─────────────────────────────────────────────
        const durationMs = parseDuration(durationInput);

        if (!durationMs) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Invalid Duration',
                    description: 'Please provide a valid duration.\n\n**Examples:** `10s`, `5m`, `2h`, `1d`',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        // Discord max timeout is 28 days
        const MAX_DURATION_MS = 28 * 24 * 60 * 60 * 1000;
        if (durationMs > MAX_DURATION_MS) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Duration Too Long',
                    description: 'The maximum mute duration is **28 days**! why not kick/ban instead, Ez solution',
                    color: 'error'
                })],
                ephemeral: true
            });
        }

        // ── Apply timeout ──────────────────────────────────────────────
        try {
            await target.timeout(durationMs, reason);

            const unmuteTimestamp = Math.floor((Date.now() + durationMs) / 1000);

            const successEmbed = createEmbed({
                title: '🔇 User Muted',
                color: 'success'
            });

            successEmbed.addFields(
                { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: '🔨 Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: '⏱️ Duration', value: durationInput, inline: true },
                { name: '🔓 Unmute', value: `<t:${unmuteTimestamp}:R>`, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            );

            successEmbed.setTimestamp();

            await InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed]
            });

        } catch (error) {
            console.error('[MUTE] Error:', error);
            await InteractionHelper.safeReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Mute Failed',
                    description: 'Something went wrong while trying to mute the user 🥲.',
                    color: 'error'
                })],
                ephemeral: true
            });
        }
    },
};

// ── Duration parser ────────────────────────────────────────────────────
function parseDuration(input) {
    const regex = /^(\d+)(s|m|h|d)$/i;
    const match = input.trim().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
}
