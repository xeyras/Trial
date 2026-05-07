if (subcommand === 'setup') {
    const channel = options.getChannel('channel');
    const message = options.getString('message');
    const image = options.getString('image');
    const ping = options.getBoolean('ping') ?? false;

    if (!message || message.trim().length === 0) {
        logger.warn(`[Welcome] Empty message provided by ${interaction.user.tag} in ${guild.name}`);
        return await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed('Invalid Input', 'Welcome message cannot be empty')],
            flags: MessageFlags.Ephemeral
        });
    }

    // Validate image URL
    if (image) {
        try {
            new URL(image);
        } catch {
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(
                    'Invalid Image URL',
                    'Please provide a valid image URL (must start with http:// or https://)'
                )],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    try {
        // ✅ ALWAYS UPDATE (no blocking)
        await updateWelcomeConfig(client, guild.id, {
            enabled: true,
            channelId: channel.id,
            welcomeMessage: message,
            welcomeImage: image || undefined,
            welcomePing: ping
        });

        logger.info(`[Welcome] Setup updated by ${interaction.user.tag} for guild ${guild.name}`);

        const previewMessage = formatWelcomeMessage(message, {
            user: interaction.user,
            guild
        });

        const embed = new EmbedBuilder()
            .setColor(getColor('success'))
            .setTitle('✅ Welcome System Updated')
            .setDescription(`Welcome messages will now be sent to ${channel}`)
            .addFields(
                { name: 'Message Preview', value: previewMessage },
                { name: 'Ping User', value: ping ? '✅ Yes' : '❌ No' },
                { name: 'Status', value: '✅ Enabled' }
            )
            .setFooter({ text: 'You can run /welcome setup anytime to change settings.' });

        if (image) embed.setImage(image);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

    } catch (error) {
        logger.error(`[Welcome] Failed to update welcome system for guild ${guild.id}:`, error);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed(
                'Setup Failed',
                'An error occurred while configuring the welcome system. Please try again.'
            )],
            flags: MessageFlags.Ephemeral
        });
    }
}
