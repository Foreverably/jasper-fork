import { DefineEvent, Event } from "../../../Common/DefineEvent";
import { ModalSubmitInteraction } from "discord.js";
import { Context } from "../../../Source/Context";
import { Emojis } from "../../../Common/Emojis";
import { RegisterInteractionById } from "../../../Common/RegisterInteractionById";
import { TagCreate } from "../Controllers/TagCreate";
import { TagExists } from "../Controllers/TagExists";
import { TagOptions } from "../Controllers/Types";

export const TagCreateModal: Event = DefineEvent({
    event: {
        name: "interactionCreate",
        once: false
    },
    on: (interaction: ModalSubmitInteraction, ctx: Context) => {
        RegisterInteractionById({
            id: `tag_create_${ interaction.user.id }`,
            ctx: ctx,
            interaction: interaction,
            typeguards: {
                negativeTypeGuards: [ "isModalSubmit" ]
            },
            callback: async (ctx: Context, interaction: ModalSubmitInteraction) => {
                const tagEmbedName: string = interaction.fields.getTextInputValue("tag_create_embed_name");
                const tagEmbedTitle: string = interaction.fields.getTextInputValue("tag_create_embed_title");
                const TagEmbedDescription: string = interaction.fields.getTextInputValue("tag_create_embed_description");
                const tagEmbedFooter: string = interaction.fields.getTextInputValue("tag_create_embed_footer");
                const tag: TagOptions = {
                    author: interaction.user.id,
                    name: tagEmbedName,
                    title: tagEmbedTitle,
                    description: TagEmbedDescription ? TagEmbedDescription : null,
                    footer: tagEmbedFooter ? tagEmbedFooter : null
                };
                if (await TagExists({ guildId: interaction.guild.id, name: tag.name, ctx: ctx })) {
                    return interaction.reply({ content: `> The support tag \`${ tag.name }\` already exists!`, ephemeral: true });
                } else {
                    await TagCreate({ guildId: interaction.guild.id, options: { author: tag.author, name: tag.name, title: tag.title, description: tag.description, footer: tag.footer }, ctx: ctx });
                    const embedObject: any = {};
                    tag.description ? embedObject["description"] = tag.description : embedObject["description"] = null;
                    tag.footer ? embedObject["footer"] = { text: tag.footer } : embedObject["footer"] = null;
                    return interaction.reply({
                        content: `${ Emojis.CHECK_MARK } Successfully created \`${ tag.name }\`!`,
                        embeds: [
                            {
                                title: tag.title,
                                color: 0x323338,
                                description: embedObject?.description,
                                footer: embedObject?.footer
                            }
                        ],
                        ephemeral: true
                    });
                }
            }
        })
    }
}) as Event;
