const mongoose = require('mongoose');
const { config } = require('dotenv');
const GuildModel = require('../Models/GuildSchema');
const schema = GuildModel.default;
config();

async function ensureSkullEmoji() {
    await mongoose.connect(process.env.MONGODB);

    const guilds = await schema.updateMany(
        {},
        {
            $set: {
                'GuildSettings.Skullboard': {
                    $cond: {
                        if: { $eq: ['$GuildSettings.Skullboard', undefined] },
                        then: {
                            SkullboardChannel: null,
                            SkullboardEmoji: '💀',
                            SkullboardReactionThreshold: 4,
                        },
                        else: {
                            SkullboardChannel: {
                                $ifNull: ['$GuildSettings.Skullboard.SkullboardChannel', null],
                            },
                            SkullboardEmoji: {
                                $ifNull: ['$GuildSettings.Skullboard.SkullboardEmoji', '💀'],
                            },
                            SkullboardReactionThreshold: {
                                $ifNull: [
                                    '$GuildSettings.Skullboard.SkullboardReactionThreshold',
                                    4,
                                ],
                            },
                        },
                    },
                },
            },
        },
    );

    console.log(`Updated ${guilds.modifiedCount} guilds with default Skullboard settings.`);
    mongoose.connection.close();
}

ensureSkullEmoji().catch((err) => {
    console.error(err);
    mongoose.connection.close();
});
