import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const parseDuration = (input) => {
    const match = input.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
};

const formatDuration = (input) => {
    const match = input.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return input;

    const value = match[1];
    const unit = { s: 'second(s)', m: 'minute(s)', h: 'hour(s)', d: 'day(s)' }[match[2]];
    return `${value} ${unit}`;
};

const getOrCreateMutedRole = async (guild) => {
    // Check if muted role already exists
    let mutedRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'muted');

    if (!mutedRole) {
        // Create the muted role
        mutedRole = await guild.roles.create({
            name: 'Muted',
            color: 0x808080,
            reason: 'Auto-created by mute command',
            permissions: [],
        });

        // Disable permissions in every channel
        const channels = await guild.channels.fetch();
        for (const [, channel] of channels) {
            if (!channel) continue;
            try {
                await channel.permissionOverwrites.create(mutedRole, {
                    SendMessages: false,
                    SendMessagesInThreads: false,
                    AddReactions: false,
                    Speak: false,
                    Stream: false,
                    UseApplicationCommands: false,
                });
            } catch {
                // skip channels we can't edit
            }
        }
    }

    return mutedRole;
};

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user for a specified duration')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration e.g. 10s, 5m, 2h, 1d')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)
        ),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction, { ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const executor = interaction.member;

        // Validate duration
        const durationMs = parseDuration(durationInput);
        if (!durationMs) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Invalid Duration',
                    description: 'Please use a valid format: `10s`, `5m`, `2h`, `1d`',
                    color: 'error',
                })]
            });
        }

        // Fetch the member
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ User Not Found',
                    description: 'That user is not in this server.',
                    color: 'error',
                })]
            });
        }

        // Check if target is muteable
        if (!targetMember.moderatable) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Cannot Mute',
                    description: 'I don\'t have permission to mute that user. They may have a higher role than me.',
                    color: 'error',
                })]
            });
        }

        // Prevent muting yourself
        if (targetUser.id === interaction.user.id) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Nice Try!',
                    description: 'You cannot mute yourself bra 💀',
                    color: 'error',
                })]
            });
        }

        // Prevent muting bots
        if (targetUser.bot) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Cannot Mute Bot',
                    description: 'You cannot mute a bot user.',
                    color: 'error',
                })]
            });
        }

        // Get or create muted role
        let mutedRole;
        try {
            mutedRole = await getOrCreateMutedRole(guild);
        } catch (err) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Role Error',
                    description: 'Failed to get or create the Muted role. Make sure I have `Manage Roles` permission.',
                    color: 'error',
                })]
            });
        }

        // Check if already muted
        if (targetMember.roles.cache.has(mutedRole.id)) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '⚠️ Already Muted',
                    description: `${targetUser} is already muted.`,
                    color: 'warning',
                })]
            });
        }

        // Apply the muted role
        try {
            await targetMember.roles.add(mutedRole, reason);
        } catch {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Failed to Mute',
                    description: 'Could not assign the Muted role. Check my role hierarchy and permissions.',
                    color: 'error',
                })]
            });
        }

        const formattedDuration = formatDuration(durationInput);
        const unmuteTime = Math.floor((Date.now() + durationMs) / 1000);

        // DM the muted user
        try {
            await targetUser.send({
                embeds: [createEmbed({
                    title: '🔇 You Have Been Muted',
                    description: `You were muted in **${guild.name}**`,
                    color: 'error',
                }).addFields(
                    { name: '⏱️ Duration', value: formattedDuration, inline: true },
                    { name: '📋 Reason', value: reason, inline: true },
                    { name: '🔓 Unmuted At', value: `<t:${unmuteTime}:F>`, inline: false },
                )]
            });
        } catch {
            // User has DMs off, that's fine
        }

        // Success reply
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '🔇 User Muted',
                description: `${targetUser} has been muted successfully.`,
                color: 'success',
            }).addFields(
                { name: '👤 User', value: `${targetUser} (${targetUser.id})`, inline: true },
                { name: '🛡️ Moderator', value: `${executor}`, inline: true },
                { name: '⏱️ Duration', value: formattedDuration, inline: true },
                { name: '📋 Reason', value: reason, inline: false },
                { name: '🔓 Unmuted At', value: `<t:${unmuteTime}:F>`, inline: false },
            )]
        });

        // Auto unmute after duration
        setTimeout(async () => {
            try {
                const freshMember = await guild.members.fetch(targetUser.id).catch(() => null);
                if (!freshMember) return;

                if (freshMember.roles.cache.has(mutedRole.id)) {
                    await freshMember.roles.remove(mutedRole, 'Mute duration expired');

                    // DM user that they are unmuted
                    try {
                        await targetUser.send({
                            embeds: [createEmbed({
                                title: '🔓 You Have Been Unmuted',
                                description: `Your mute in **${guild.name}** has expired. You can chat again!`,
                                color: 'success',
                            })]
                        });
                    } catch {
                        // DMs off
                    }
                }
            } catch {
                // Member left or other error
            }
        }, durationMs);
    },
};
