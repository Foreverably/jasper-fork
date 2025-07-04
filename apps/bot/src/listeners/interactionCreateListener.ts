import { PermissionsToHuman, PlantPermission } from '@antibot/interactions';
/* eslint @typescript-eslint/no-explicit-any: "off" */
import {
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    ContainerBuilder,
    ContextMenuCommandInteraction,
    Interaction as InteractionEvent,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ModalSubmitInteraction,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from 'discord.js';

import { Context } from '../classes/context';
import { withConfigurationRoles } from '../db';
import { Command, defineEvent, message } from '../define';
import { Emojis } from '../enums';
import { Options, Tag, TagResponse } from '../services/tagService';

import { Listener } from './listener';

export default class InteractionCreateListener extends Listener<'interactionCreate'> {
    constructor(ctx: Context) {
        super(ctx, 'interactionCreate');
    }

    public async execute<
        Interaction extends
            | ButtonInteraction
            | ChatInputCommandInteraction
            | ContextMenuCommandInteraction
            | InteractionEvent
            | ModalSubmitInteraction,
    >(interaction: Interaction): Promise<void> {
        await this.handleCommands(interaction);
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('list_subcommand_button_')) {
                await this.onListSubCommandButtons(interaction);
            } else if (interaction.customId.startsWith('add_topic_subcommand_button_')) {
                await this.onAddTopicSubCommandButtons(interaction);
            }
        }
        if (interaction.isModalSubmit()) {
            await this.handleModalSubmit(interaction);
        }
    }

    public toEvent() {
        return defineEvent({
            event: {
                name: this.name,
                once: this.once,
            },
            on: (interaction: InteractionEvent) => this.execute(interaction),
        });
    }

    private async handleCommands(
        interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | InteractionEvent,
    ): Promise<void> {
        switch (true) {
            case interaction.isChatInputCommand() || interaction.isContextMenuCommand(): {
                const command: Command<
                    ChatInputCommandInteraction | ContextMenuCommandInteraction
                > = this.ctx.interactions.get(interaction.commandName);
                if (command) {
                    if (command.restrictToConfigRoles?.length) {
                        const { noRolesNoConfig, noRolesWithConfig } = await withConfigurationRoles(
                            this.ctx,
                            interaction,
                            ...command.restrictToConfigRoles,
                        );

                        let configError = false;
                        noRolesWithConfig(interaction, () => {
                            configError = true;
                        });

                        noRolesNoConfig(interaction, () => {
                            message.content +=
                                ' Configuration of roles required. Please check with the server administrator.';
                            configError = true;
                        });

                        if (configError) {
                            await interaction.reply(message);
                            message.content = "Sorry but you can't use this command.";
                            return;
                        }
                    }
                    if (command.permissions) {
                        const perms: any[] = [];
                        if (!interaction.appPermissions.has(command.permissions)) {
                            for (const permission of command.permissions) {
                                perms.push(
                                    PermissionsToHuman(PlantPermission(permission.toString())),
                                );
                            }
                            await interaction.reply({
                                content: `I'm missing permissions! (${
                                    perms.length <= 2 ? perms.join(' & ') : perms.join(', ')
                                })`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                    }

                    command.on(this.ctx, interaction);
                }
                break;
            }
            case interaction.isAutocomplete(): {
                const command: Command<
                    ChatInputCommandInteraction | ContextMenuCommandInteraction
                > = this.ctx.interactions.get(interaction.commandName);
                if (command && command.autocomplete) {
                    if (command.permissions) {
                        if (!interaction.appPermissions.has(command.permissions)) {
                            return interaction.respond([]);
                        }
                    }
                    command.autocomplete(this.ctx, interaction);
                }
                break;
            }
        }
    }

    private async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
        if (!interaction.isModalSubmit()) return;

        // Handle Tag Create Modal
        if (interaction.customId === `tag_create_${interaction.user.id}`) {
            const name = interaction.fields.getTextInputValue('tag_create_embed_name');
            const title = interaction.fields.getTextInputValue('tag_create_embed_title');
            const author = interaction.user.id;
            const description =
                interaction.fields.getTextInputValue('tag_create_embed_description') ?? null;
            const image_url =
                interaction.fields.getTextInputValue('tag_create_embed_image_url') ?? null;
            const footer = interaction.fields.getTextInputValue('tag_create_embed_footer') ?? null;

            if (!interaction.guild) return;

            this.ctx.services.tags.configure<Options>({
                guildId: interaction.guild.id,
                name,
                tag: { author, description, footer, image_url, name, title },
            });

            if (await this.ctx.services.tags.itemExists<Options>()) {
                await interaction.reply({
                    content: `> The support tag \`${name}\` already exists!`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (image_url && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(image_url)) {
                await interaction.reply({
                    content: `> The provided image link is not a valid image URL!`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await this.ctx.services.tags.create<Options & { tag: Tag }, void>();

                const confirmContent = new TextDisplayBuilder().setContent(
                    `${Emojis.CHECK_MARK} Successfully created \`${name}\`!`,
                );

                const container = new ContainerBuilder()
                    .setAccentColor(global.embedColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${description}`),
                    );

                if (image_url) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(`${image_url}`),
                        ),
                    );
                }
                if (footer) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    ),
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ${footer}`),
                        );
                }
                await interaction.reply({
                    components: [confirmContent, container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }
        }

        // Handle Tag Edit Modal
        if (interaction.customId === `tag_edit_${interaction.user.id}`) {
            try {
                const name = interaction.fields.getTextInputValue('tag_edit_embed_name');
                const title =
                    interaction.fields.getTextInputValue('tag_edit_embed_title').trim() ||
                    undefined;
                const editedBy = interaction.user.id;
                const description =
                    interaction.fields.getTextInputValue('tag_edit_embed_description').trim() ||
                    null;
                const image_url =
                    interaction.fields.getTextInputValue('tag_edit_embed_image_url').trim() || null;
                const footer =
                    interaction.fields.getTextInputValue('tag_edit_embed_footer').trim() || null;

                if (!interaction.guild) return;
                const guildId = interaction.guild.id;

                if (!(await this.ctx.services.tags.itemExists<Options>({ guildId, name }))) {
                    await interaction.reply({
                        content: `> The support tag \`${name}\` doesn't exist!`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                if (image_url && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(image_url)) {
                    await interaction.reply({
                        content: `> The provided image link is not a valid image URL!`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                this.ctx.services.tags.configure<Options>({
                    guildId,
                    name,
                    tag: { description, editedBy, footer, image_url, name, title },
                });

                await this.ctx.services.tags.modify<Options & { tag: Tag }, void>();

                const { TagEmbedDescription, TagEmbedFooter, TagEmbedImageURL, TagEmbedTitle } =
                    await this.ctx.services.tags.getValues<Options, TagResponse>({
                        guildId,
                        name,
                    });

                const confirmContent = new TextDisplayBuilder().setContent(
                    `${Emojis.CHECK_MARK} Successfully edited \`${name}\`!`,
                );

                const container = new ContainerBuilder()
                    .setAccentColor(global.embedColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${TagEmbedTitle}`),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${TagEmbedDescription}`),
                    );

                if (image_url) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(`${TagEmbedImageURL}`),
                        ),
                    );
                }
                if (footer) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    ),
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ${TagEmbedFooter}`),
                        );
                }

                await interaction.reply({
                    components: [confirmContent, container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            } catch (error) {
                throw 'Error on TagEditModal ' + error.stack || error;
            }
        }
    }

    private async onAddTopicSubCommandButtons(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.isButton()) return;
        const author = interaction.user.id;
        const title = 'Current Topics in Configuration';
        if (!interaction.guild) return;
        const thumbnail = { url: interaction.guild.iconURL() ?? '' };
        const color = global.embedColor;
        const description = '';
        const footer = { text: '' };

        const currentUserState = this.ctx.pagination.get(author);
        if (!currentUserState) return;

        const embedBase = {
            color,
            description,
            footer,
            thumbnail,
            title,
        };

        const updateEmbed = async () => {
            embedBase.description = currentUserState.addTopicPages.pages[
                currentUserState.addTopicPages.page
            ]
                .map(
                    (string, i) =>
                        `**${currentUserState.addTopicPages.page * 10 + i + 1}.** *${string}*`,
                )
                .join('\n');

            embedBase.footer.text = `Page: ${currentUserState.addTopicPages.page + 1}/${
                currentUserState.addTopicPages.pages.length
            } • Total Topics: ${
                (
                    await this.ctx.services.settings.getTopics<string>(
                        interaction.guild!.id,
                        'Topics',
                    )
                ).length
            }`;

            const row = {
                components: [
                    {
                        customId: `add_topic_subcommand_button_previous_${interaction.user.id}`,
                        disabled: currentUserState.addTopicPages.page === 0,
                        label: 'Previous',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `add_topic_subcommand_button_home_${interaction.user.id}`,
                        label: 'Home',
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `add_topic_subcommand_button_next_${interaction.user.id}`,
                        disabled:
                            currentUserState.addTopicPages.page ===
                            currentUserState.addTopicPages.pages.length - 1,
                        label: 'Next',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                ],
                type: ComponentType.ActionRow,
            } as const;

            await interaction.update({
                components: [row],
                embeds: [embedBase],
            });
        };

        switch (interaction.customId) {
            case `add_topic_subcommand_button_home_${author}`:
                currentUserState.addTopicPages.page = 0;
                break;

            case `add_topic_subcommand_button_next_${author}`:
                currentUserState.addTopicPages.page =
                    (currentUserState.addTopicPages.page + 1) %
                    currentUserState.addTopicPages.pages.length;
                break;

            case `add_topic_subcommand_button_previous_${author}`:
                currentUserState.addTopicPages.page =
                    (currentUserState.addTopicPages.page -
                        1 +
                        currentUserState.addTopicPages.pages.length) %
                    currentUserState.addTopicPages.pages.length;
                break;

            default:
                break;
        }

        this.ctx.pagination.set(author, currentUserState);
        await updateEmbed();
    }

    private async onListSubCommandButtons(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.isButton()) return;

        const author = interaction.user.id;
        const title = 'Server Tag List';
        if (!interaction.guild) return;
        const thumbnail = { url: interaction.guild.iconURL() ?? '' };
        const color = global.embedColor;
        const description = '';
        const footer = { text: '' };

        const currentUserState = this.ctx.pagination.get(author);
        if (!currentUserState) return;

        const embedBase = {
            color,
            description,
            footer,
            thumbnail,
            title,
        };

        const updateEmbed = async () => {
            embedBase.description = currentUserState.tagPages[currentUserState.page]
                .map(
                    (e, i) =>
                        `> **${currentUserState.page * 10 + i + 1}.** \`${e.TagName}\` **•** ${
                            e.TagAuthor ? `<@${e.TagAuthor}>` : 'None'
                        }`,
                )
                .join('\n');

            embedBase.footer.text = `Page: ${currentUserState.page + 1}/${
                currentUserState.tagPages.length
            } • emojis by AnThOnY & deussa`;

            const row = {
                components: [
                    {
                        customId: `list_subcommand_button_previous_${interaction.user.id}`,
                        disabled: currentUserState.page === 0,
                        label: 'Previous',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `list_subcommand_button_home_${interaction.user.id}`,
                        label: 'Home',
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `list_subcommand_button_next_${interaction.user.id}`,
                        disabled: currentUserState.page === currentUserState.tagPages.length - 1,
                        label: 'Next',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                ],
                type: ComponentType.ActionRow,
            } as const;

            await interaction.update({
                components: [row],
                embeds: [embedBase],
            });
        };

        switch (interaction.customId) {
            case `list_subcommand_button_home_${author}`:
                currentUserState.page = 0;
                break;

            case `list_subcommand_button_next_${author}`:
                currentUserState.page =
                    (currentUserState.page + 1) % currentUserState.tagPages.length;
                break;

            case `list_subcommand_button_previous_${author}`:
                currentUserState.page =
                    (currentUserState.page - 1 + currentUserState.tagPages.length) %
                    currentUserState.tagPages.length;
                break;

            default:
                break;
        }

        this.ctx.pagination.set(author, currentUserState);
        await updateEmbed();
    }
}
