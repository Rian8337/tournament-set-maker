const fs = require('fs');
const { askInput, fetchBeatmap } = require('./util');
let config = require('./config.json');

/**
 * Saves the current configuration and reassigns the global config variable to the new configuration.
 * 
 * @param {string} currentConfig The current configuration.
 * @returns {Promise<void>}
 */
function reloadAndSaveNewConfig(currentConfig) {
    return new Promise(async resolve => {
        await fs.promises.writeFile('config.json', JSON.stringify(currentConfig, null, "\t"));
        config = require('./config.json');
        resolve();
    });
}

/**
 * Modifies the configuration file.
 * 
 * @param {boolean} askForPoolID Whether or not to ask for pool ID.
 * @param {boolean} askForArtist Whether or not to ask for set artist.
 * @param {boolean} askForTitle Whether or not to ask for set title.
 * @param {boolean} askForSpecial Whether or not to ask for special pick count.
 * @param {boolean} askForBeatmaps Whether or not to ask for beatmaps.
 * @returns {Promise<void>}
 */
function configure(askForPoolID = false, askForArtist = false, askForTitle = false, askForSpecial = false, askForBeatmaps = false) {
    return new Promise(async resolve => {
        // Load current config
        if (askForPoolID) {
            config.poolid = await askInput("Insert pool ID: ");
            await reloadAndSaveNewConfig(config);
        }

        if (!config.artist || askForArtist) {
            if (!askForArtist) {
                console.log("Artist for this set not found. If this is first time usage, ignore this warning.");
            }
            while (true) {
                config.artist = await askInput("Insert artist: ");
                if (config.artist) {
                    await reloadAndSaveNewConfig(config);
                    break;
                }
            }
        }

        if (!config.title || askForTitle) {
            if (!askForTitle) {
                console.log("Title for this set not found. If this is first time usage, ignore this warning.");
            }
            while (true) {
                config.title = await askInput("Insert title: ");
                if (config.title) {
                    await reloadAndSaveNewConfig(config);
                    console.log();
                    break;
                }
            }
        }

        const beatmapCounts = [];
        for (const mode in config.format) {
            beatmapCounts.push({
                mode,
                count: config.format[mode].length
            });
        }

        const isBeatmapEmpty = beatmapCounts.every(v => v.count === 0);
        if (isBeatmapEmpty || askForSpecial || askForBeatmaps) {
            beatmapCounts.length = 0;
            if (!askForSpecial && !askForBeatmaps) {
                console.log("No beatmaps found! Please follow the following configuration procedure. If this is first time usage, ignore this warning.");
                console.log();
            }

            // Beatmap amount
            if (isBeatmapEmpty || askForBeatmaps) {
                for (const mode in config.format) {
                    while (true) {
                        const count = parseInt(await askInput(`Insert amount of beatmaps for ${mode.toUpperCase()}: `));
                        if (isNaN(count) || count < 0) {
                            console.log("Invalid amount");
                            continue;
                        }
                        beatmapCounts.push({
                            mode,
                            count
                        });
                        break;
                    }
                }
                console.log();
            }

            // Special pick amount
            if (isBeatmapEmpty || askForSpecial) {
                for (const mode in config.format) {
                    const beatmapCount = beatmapCounts.find(v => v.mode === mode).count;
    
                    while (true) {
                        const amount = parseInt(await askInput(`Insert amount of special picks for ${mode.toUpperCase()}: `));
                        if (isNaN(amount) || amount < 0) {
                            console.log("Invalid amount");
                            continue;
                        }
    
                        if (amount > beatmapCount) {
                            console.log(`Invalid amount, beatmap count for ${mode.toUpperCase()} is ${beatmapCount}`);
                            continue;
                        }
    
                        config.special_picks[mode] = amount;
                        break;
                    }
                }
                await reloadAndSaveNewConfig(config);
                console.log();
            }

            // Beatmaps
            if (isBeatmapEmpty || askForBeatmaps) {
                let isUseCustomScorePortions;
                while (true) {
                    const input = (await askInput("Do you want to use custom score portions (default is 60% score, 40% accuracy)? This will affect how ScoreV2 is calculated if you use bot. [Y/N, case insensitive]\n")).toUpperCase();
                    if (input !== "Y" && input !== "N") {
                        console.log("Invalid input");
                        continue;
                    }
                    isUseCustomScorePortions = input === "Y";
                    console.log();
                    break;
                }

                for (const mode in config.format) {
                    const beatmapCount = beatmapCounts.find(v => v.mode === mode).count;
                    const specialPicksAmount = config.special_picks[mode];
                    let specialCountIndex = 0;
                    
                    for (let i = 0; i < beatmapCount; ++i) {
                        let pick = mode.toUpperCase();
                        if (beatmapCount > 1) {
                            if (specialPicksAmount && beatmapCount - i + 1 < specialPicksAmount) {
                                if (specialPicksAmount > 1) {
                                    ++specialCountIndex;
                                    pick += `S${specialCountIndex}`;
                                } else {
                                    pick += "S";
                                }
                            } else {
                                pick += i + 1;
                            }
                        }
    
                        const entry = {
                            link: "",
                            scorePortion: {
                                combo: 0.6,
                                accuracy: 0.4
                            }
                        };
    
                        while (true) {
                            const beatmapLink = await askInput(`Insert beatmap link or ID for ${pick}: `);
                            const a = beatmapLink.split("/");
                            const beatmapID = parseInt(a[a.length - 1]);
                            if (isNaN(beatmapID) || beatmapID <= 0) {
                                console.log("Invalid beatmap link or ID");
                                continue;
                            }
                            const isBeatmapAvailable = await fetchBeatmap(beatmapID);
                            if (!isBeatmapAvailable) {
                                console.log("Beatmap ID or link is not available in osu! beatmap listing");
                                continue;
                            }

                            entry.link = beatmapLink;
                            break;
                        }
    
                        if (isUseCustomScorePortions) {
                            while (true) {
                                const scorePortion = parseFloat(await askInput(`Insert score portion for ${pick} (from 0 to 100, accuracy portion will be automatically computed): `));
                                if (isNaN(scorePortion) || scorePortion < 0 || scorePortion > 100) {
                                    console.log("Invalid score portion");
                                    continue;
                                }
        
                                entry.scorePortion.combo = parseFloat((scorePortion / 100).toFixed(2));
                                entry.scorePortion.accuracy = parseFloat((1 - scorePortion / 100).toFixed(2));
                                break;
                            }
                        }
                        console.log();
                        config.format[mode].push(entry);
                    }
                }
                await reloadAndSaveNewConfig(config);
                console.log();
            }
        }

        // Summarize output
        console.log("------------- Tournament Set Information -------------");
        console.log();
        console.log("Pool ID: " + (config.poolid ? config.poolid : "None"));
        console.log("Artist: " + config.artist);
        console.log("Title: " + config.title);
        console.log("Final Set Name: " + config.artist + " - " + config.title);
        console.log();
        console.log("Special picks amount:");
        for (const mode in config.special_picks) {
            console.log(mode.toUpperCase() + ": " + config.special_picks[mode]);
        }
        console.log();
        console.log("Beatmap Information:");

        const tableOutput = [];
        for (const mode in config.format) {
            const beatmapCount = beatmapCounts.find(v => v.mode === mode).count;
            const specialPicksAmount = config.special_picks[mode];
            let specialCountIndex = 0;

            for (let i = 0; i < beatmapCount; ++i) {
                let pick = mode.toUpperCase();
                if (beatmapCount > 1) {
                    if (specialPicksAmount && beatmapCount - i + 1 < specialPicksAmount) {
                        if (specialPicksAmount > 1) {
                            ++specialCountIndex;
                            pick += `S${specialCountIndex}`;
                        } else {
                            pick += "S";
                        }
                    } else {
                        pick += i + 1;
                    }
                }
                const entry = config.format[mode][i];
                let beatmapID = entry.link;
                if (typeof beatmapID === 'string') {
                    const a = beatmapID.split("/");
                    beatmapID = parseInt(a[a.length - 1]);
                }

                tableOutput.push({
                    "Pick": pick,
                    "Beatmap ID": beatmapID,
                    "Combo Score Portion (%)": parseFloat((entry.scorePortion.combo * 100).toFixed(2)),
                    "Accuracy Score Portion (%)": parseFloat((entry.scorePortion.accuracy * 100).toFixed(2))
                });
            }
        }

        console.table(tableOutput);

        console.log();
        let isRedoInput;
        while (true) {
            const input = (await askInput("Do you want to save this information and make a tournament set out of it? [Y/N, case insensitive]\n")).toUpperCase();
            if (input !== "Y" && input !== "N") {
                console.log("Invalid input");
                continue;
            }
            isRedoInput = input === "N";
            break;
        }

        if (isRedoInput) {
            console.log();
            while (true) {
                const validInputs = ["pool id", "artist", "title", "special pick count", "beatmaps"];
                const input = (await askInput("Choose which section that you want to edit. Valid inputs are 'pool id', 'artist', 'title', 'special pick count', and 'beatmaps' (all case insensitive).\n")).toLowerCase();
                if (validInputs.includes(input)) {
                    console.log();
                    return resolve(
                        await configure(
                            input === 'pool id',
                            input === 'artist',
                            input === 'title',
                            input === 'special pick count',
                            input === 'beatmaps'
                        )
                    );
                } else {
                    console.log("Invalid input");
                }
            }
        } else {
            resolve();
        }
    });
}

module.exports = configure;