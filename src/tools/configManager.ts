import { MathUtils, ModUtil, Utils } from "@rian8337/osu-base";
import { writeFile } from "fs/promises";
import {
    downloadBeatmap,
    getInput,
    loadedBeatmaps,
    usedBeatmaps,
} from "./util";
import config from "../../config.json";
import { loadBeatmapsets } from "./beatmapLoader";
import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { assignPickIDs, assignPickID } from "../handlers/beatmapPickIDHandler";
import {
    assignGloballyRequiredMods,
    assignRequiredMods,
} from "../handlers/beatmapRequiredModsHandler";
import {
    assignGlobalScorePortion,
    assignScorePortion,
} from "../handlers/beatmapScorePortionHandler";
import {
    assignAllowedMods,
    assignGloballyAllowedMods,
} from "../handlers/beatmapAllowedModsHandler";
import { Config } from "../interfaces/Config";
import { FullBeatmap } from "../interfaces/FullBeatmap";
import { ConfigBeatmap } from "../interfaces/ConfigBeatmap";
import { pickBeatmaps } from "./beatmapPicker";
import { assignGlobalMinimumPlayers, assignMinimumPlayers } from "../handlers/beatmapMinimumPlayersHandler";

/**
 * Initializes and/or modifies configuration.
 */
export async function initConfiguration(): Promise<void> {
    console.log("Initializing configuration");

    console.log();

    await loadExistingConfiguration();

    await finalConfiguration();
}

/**
 * Saves the current configuration state.
 *
 * @param currentConfig The configuration state to save. Defaults to the imported configuration.
 */
export async function saveConfig(currentConfig?: Config): Promise<void> {
    const newConfig: Config = {
        poolId: currentConfig?.poolId ?? (<Config>config).poolId,
        artist: currentConfig?.artist ?? (<Config>config).artist,
        title: currentConfig?.title ?? (<Config>config).title,
        beatmaps: currentConfig?.beatmaps ?? (<Config>config).beatmaps,
    };

    await writeFile(
        `${process.cwd()}/config.json`,
        JSON.stringify(newConfig, null, "\t")
    );
}

async function loadExistingConfiguration(): Promise<void> {
    console.log("Loading existing configuration file");

    console.log();

    for (const configBeatmap of (<Config>config).beatmaps) {
        const beatmap = loadedBeatmaps.get(configBeatmap.hash);

        if (!beatmap) {
            console.log(
                `Couldn't find ${configBeatmap.name} from loaded beatmaps. Skipping beatmap`
            );

            continue;
        }

        await insertConfigBeatmap(beatmap, configBeatmap);
    }

    if (config.beatmaps.length > 0) {
        console.log();
    }

    console.log("Successfully loaded existing configuration file");

    console.log();
}

async function getPoolID(): Promise<void> {
    config.poolId = await getInput("Insert the tournament set's pool ID.");

    await saveConfig();
}

async function getArtist(): Promise<void> {
    config.artist = await getInput("Insert the tournament set's artist.", {
        allowBlank: false,
    });

    await saveConfig();
}

async function getTitle(): Promise<void> {
    config.title = await getInput("Insert the tournament set's title.", {
        allowBlank: false,
    });

    await saveConfig();
}

async function insertBeatmaps(): Promise<void> {
    await forceInsertOrDownloadBeatmapset();

    const availableBeatmaps = loadedBeatmaps.difference(usedBeatmaps);

    if (availableBeatmaps.size === 0) {
        console.log("There are no beatmaps left to insert!");
    }

    for (const beatmap of (await pickBeatmaps(availableBeatmaps)).values()) {
        await insertBeatmap(beatmap);
    }

    console.log();
}

async function insertBeatmap(beatmap: FullBeatmap): Promise<void> {
    const beatmapData: UsedBeatmap = {
        ...beatmap,
        pickId: "",
        comboScorePortion: 0.4,
        allowedMods: [],
        requiredMods: [],
        minPlayers: "ALL",
    };

    usedBeatmaps.set(beatmapData.hash, beatmapData);

    const index = (<Config>config).beatmaps.findIndex(
        (b) => b.hash === beatmapData.hash
    );

    if (index === -1) {
        (<Config>config).beatmaps.push({
            pickId: "",
            name: beatmap.fullTitle,
            hash: beatmapData.hash,
            comboScorePortion: 0.4,
            allowedMods: "",
            requiredMods: "",
            minPlayers: "ALL",
        });

        await saveConfig();
    }

    console.log(`${beatmap.fullTitle} has been inserted to the tournament set`);
}

async function insertConfigBeatmap(
    beatmap: FullBeatmap,
    configBeatmap: ConfigBeatmap
): Promise<void> {
    const beatmapData: UsedBeatmap = {
        ...beatmap,
        pickId: configBeatmap.pickId,
        comboScorePortion: configBeatmap.comboScorePortion,
        allowedMods: ModUtil.pcStringToMods(configBeatmap.allowedMods),
        requiredMods: ModUtil.pcStringToMods(configBeatmap.requiredMods),
        minPlayers: configBeatmap.minPlayers,
    };

    usedBeatmaps.set(beatmapData.hash, beatmapData);

    console.log(`${beatmap.fullTitle} has been inserted to the tournament set`);
}

async function removeBeatmaps(): Promise<void> {
    if (usedBeatmaps.size === 0) {
        return console.log("You have no inserted beatmaps!");
    }

    for (const beatmap of (await pickBeatmaps(usedBeatmaps)).values()) {
        await removeBeatmap(beatmap);
    }

    console.log();
}

async function removeAllBeatmaps(): Promise<void> {
    if (usedBeatmaps.size === 0) {
        return console.log("You have no inserted beatmaps!");
    }

    const confirmation = (
        await getInput(
            "Are you sure you want to remove all inserted beatmaps?",
            {
                allowBlank: false,
                caseSensitive: false,
                validInputs: ["Y", "N"],
            }
        )
    ).toLowerCase();

    if (confirmation !== "y") {
        return;
    }

    for (const beatmap of usedBeatmaps.values()) {
        await removeBeatmap(beatmap);
    }

    console.log();
}

async function removeBeatmap(beatmap: UsedBeatmap): Promise<void> {
    usedBeatmaps.delete(beatmap.hash);

    const index = (<Config>config).beatmaps.findIndex(
        (b) => b.hash === beatmap.hash
    );

    if (index !== -1) {
        config.beatmaps.splice(index, 1);

        await saveConfig();
    }

    console.log(
        `${beatmap.fullTitle} has been removed from the tournament set`
    );
}

async function downloadBeatmapset(): Promise<void> {
    let beatmapsetId = Number.NaN;

    while (Number.isNaN(beatmapsetId)) {
        const input = (
            await getInput(
                'Enter the beatmapset ID or link of the beatmap that you want to download. Enter "q" to exit from this menu.',
                { allowBlank: false, caseSensitive: false }
            )
        ).toLowerCase();

        if (input === "q") {
            break;
        }

        beatmapsetId = parseInt(input);

        if (Number.isNaN(beatmapsetId)) {
            const split = input.split("/");

            const index =
                split.indexOf("beatmapsets") + 1 || split.indexOf("s") + 1;

            const id = parseInt(split[index]);

            if (!Number.isNaN(id)) {
                beatmapsetId = id;
            }
        }

        if (Number.isNaN(beatmapsetId)) {
            console.log("Invalid beatmapset ID");
        }
    }

    if (Number.isNaN(beatmapsetId)) {
        return;
    }

    const confirmation = (
        await getInput(
            `Are you sure you want to download beatmapset ${beatmapsetId}?`,
            { caseSensitive: false, allowBlank: false, validInputs: ["Y", "N"] }
        )
    ).toLowerCase();

    if (confirmation === "y") {
        await downloadBeatmap(beatmapsetId);
    }
}

async function forceInsertOrDownloadBeatmapset(): Promise<void> {
    while (loadedBeatmaps.size === 0) {
        const input = parseInt(
            await getInput(
                "No beatmapsets have been loaded! Please enter at least one beatmapset to the maps folder and enter 1 to reload beatmapsets, or enter 2 to download a beatmapset from Sayobot.",
                {
                    allowBlank: false,
                    caseSensitive: false,
                    validInputs: ["1", "2"],
                }
            )
        );

        switch (input) {
            case 1:
                await loadBeatmapsets();
                break;
            case 2:
                await downloadBeatmapset();
                break;
        }
    }
}

async function resetConfiguration(): Promise<void> {
    const confirmation = (
        await getInput(
            "Are you sure you want to reset the current configuration? You will be prompted to reconfigure.",
            { caseSensitive: false, allowBlank: false, validInputs: ["Y", "N"] }
        )
    ).toLowerCase();

    if (confirmation !== "y") {
        return;
    }

    config.poolId = "";
    config.artist = "";
    config.title = "";
    config.beatmaps = [];

    usedBeatmaps.clear();

    await saveConfig();
}

async function finalConfiguration(): Promise<void> {
    const choices = [
        /* 1  */ "Enter tournament set pool ID",
        /* 2  */ "Enter tournament set artist",
        /* 3  */ "Enter tournament set title",
        /* 4  */ "Reload beatmapsets",
        /* 5  */ "Download a beatmapset from Sayobot",
        /* 6  */ "Insert a beatmap to the tournament set",
        /* 7  */ "Remove a beatmap from the tournament set",
        /* 8  */ "Remove all beatmaps from the tournament set",
        /* 9  */ "Assign pick IDs for every beatmap",
        /* 10 */ "Assign a pick ID to a beatmap",
        /* 11 */ "Assign a global combo score portion (will apply to every currently inserted beatmap)",
        /* 12 */ "Assign a combo score portion to a beatmap",
        /* 13 */ "Assign globally required mods (will apply to every currently inserted beatmap)",
        /* 14 */ "Assign required mods to a beatmap",
        /* 15 */ "Assign globally allowed mods (will apply to every currently inserted beatmap)",
        /* 16 */ "Assign allowed mods to a beatmap",
        /* 17 */ "Assign a global amount of minimum players (will apply to every currently inserted beatmap)",
        /* 18 */ "Assign an amount of minimum players to a beatmap",
        /* 19 */ "Reset configuration",
        /* 20 */ "Exit from menu and generate tournament set",
    ];

    const allowedInputs = Utils.initializeArray(choices.length, 1).map((v, i) =>
        (v + i).toString()
    );

    while (true) {
        if (!config.artist) {
            await getArtist();
        }

        if (!config.title) {
            await getTitle();
        }

        while (usedBeatmaps.size === 0) {
            console.log(
                "Please pick at least one beatmap to be used for the tournament set!"
            );

            console.log();

            await insertBeatmaps();
        }

        console.log("------------- Tournament Set Information -------------");
        console.log();
        console.log("Pool ID: " + (config.poolId ? config.poolId : "None"));
        console.log("Artist: " + config.artist);
        console.log("Title: " + config.title);
        console.log("Final Set Name: " + config.artist + " - " + config.title);
        console.log();
        console.log("Beatmap Information:");

        console.table(
            usedBeatmaps.map((v) => {
                return {
                    "Pick ID": v.pickId,
                    "Beatmap Name": `${v.beatmap.artist} - ${v.beatmap.title} (${v.beatmap.creator}) [${v.beatmap.version}]`,
                    "Combo Portion (%)": MathUtils.round(
                        v.comboScorePortion * 100,
                        2
                    ),
                    "Required Mods":
                        v.requiredMods.map((m) => m.acronym).join("") || "None",
                    "Allowed Mods":
                        v.allowedMods.map((m) => m.acronym).join("") || "None",
                    "Minimum Players": v.minPlayers,
                };
            })
        );

        const input = parseInt(
            await getInput(
                "Choose the action that you want to do.\n" +
                choices.map((v, i) => `${i + 1}. ${v}`).join("\n"),
                {
                    allowBlank: false,
                    caseSensitive: false,
                    validInputs: allowedInputs,
                }
            )
        );

        switch (input) {
            case 1:
                await getPoolID();
                break;
            case 2:
                await getArtist();
                break;
            case 3:
                await getTitle();
                break;
            case 4:
                await loadBeatmapsets();
                break;
            case 5:
                await downloadBeatmapset();
                break;
            case 6:
                await insertBeatmaps();
                break;
            case 7:
                await removeBeatmaps();
                break;
            case 8:
                await removeAllBeatmaps();
                break;
            case 9:
                await assignPickIDs();
                break;
            case 10:
                await assignPickID();
                break;
            case 11:
                await assignGlobalScorePortion();
                break;
            case 12:
                await assignScorePortion();
                break;
            case 13:
                await assignGloballyRequiredMods();
                break;
            case 14:
                await assignRequiredMods();
                break;
            case 15:
                await assignGloballyAllowedMods();
                break;
            case 16:
                await assignAllowedMods();
                break;
            case 17:
                await assignGlobalMinimumPlayers();
                break;
            case 18:
                await assignMinimumPlayers();
                break;
            case 19:
                await resetConfiguration();
                break;
            case 20:
                if (usedBeatmaps.some((v) => !v.pickId)) {
                    console.log(
                        "Some beatmaps have not been assigned a pick ID yet! Please assign a pick ID to every beatmap"
                    );

                    break;
                }

                return;
        }
    }
}
