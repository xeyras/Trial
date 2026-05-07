import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("bug")
        .setDescription("Report a bug or issue with the bot"),
    async execute(interaction) {
        const discordButton = new ButtonBuilder()
            .setLabel('🐛 Report Bug on Discord!')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/fqRxs9eS'); // ✅ already correct

        const row = new ActionRowBuilder().addComponents(discordButton); // ✅ fixed variable name

        const bugReportEmbed = createEmbed({
            title: '🐛 Bug Report',
            description: 'Found a bug? Please report it on @juicewo_ DM!\n\n' +
            '**When reporting a bug, please include:**\n' +
            '• 📝 Detailed description of the issue\n' +
            '• 🔄 Steps to reproduce the pr0blemos\n' +
            '• 📸 Screenshots if applicable. cuz why not!\n' +
            '• 💻 Your bot version and environment ez\n\n' +
            'This helps us fix issues faster and more effectively! EZ',
            color: 'error'
        })
            .setTimestamp();

        await InteractionHelper.safeReply(interaction, {
            embeds: [bugReportEmbed],
            components: [row],
        });
    },
};
