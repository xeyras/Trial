import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a muted user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
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
        ),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction, { ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const guild = interaction.guild;
        const executor = interaction.member;

        // Fetch member
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ User Not Found',
                    description: 'That user could not be found in this server.',
                    color: 'error',
                })]
            });
        }

        // Check bot can moderate target
        if (!targetMember.moderatable) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Cannot Unmute User',
                    description: 'I cannot unmute this user. They may have a higher role than me.',
                    color: 'error',
                })]
            });
        }

        // Find muted role
        const mutedRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'muted');
        if (!mutedRole) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ No Muted Role',
                    description: 'There is no Muted role in this server. Nobody has been muted yet.',
                    color: 'error',
                })]
            });
        }

        // Check if user actually has the muted role
        if (!targetMember.roles.cache.has(mutedRole.id)) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Not Muted',
                    description: `${targetUser} is not currently muted, you bully <:ohreeee:1406787354081103953>`,
                    color: 'error',
                })]
            });
        }

        // Remove muted role
        try {
            await targetMember.roles.remove(mutedRole, reason);
        } catch {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [createEmbed({
                    title: '❌ Unmute Failed',
                    description: 'Could not remove the Muted role. Check my role hierarchy and permissions.',
                    color: 'error',
                })]
            });
        }

        // DM the unmuted user
        try {
            await targetUser.send({
                embeds: [createEmbed({
                    title: '🔓 You Have Been Unmuted',
                    description: `You have been unmuted in **${guild.name}**. You can chat again!`,
                    color: 'success',
                }).addFields(
                    { name: '📋 Reason', value: reason, inline: true },
                    { name: '🛡️ Moderator', value: `${executor}`, inline: true },
                )]
            });
        } catch {
            // DMs off, that's fine
        }

        // Success reply
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '🔊 User Unmuted! now yapp bro!',
                description: `${targetUser} has been unmuted successfully.`,
                color: 'success',
            }).addFields(
                { name: '👤 User', value: `${targetUser} (${targetUser.id})`, inline: true },
                { name: '🛡️ Moderator', value: `${executor}`, inline: true },
                { name: '📋 Reason', value: reason, inline: false },
            ).setTimestamp()]
        });
    },
};
