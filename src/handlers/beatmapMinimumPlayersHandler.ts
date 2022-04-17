import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { usedBeatmaps, getInput } from "../tools/util";
import { Config } from "../interfaces/Config";
import { saveConfig } from "../tools/configManager";
import { pickBeatmap } from "../tools/beatmapPicker";
import { MinPlayers } from "../types/MinPlayers";

/**
 * Assigns an amount of minimum players to all beatmaps.
 */
export async function assignGlobalMinimumPlayers(): Promise<void> {
    const minPlayers = await getMinimumPlayers();

    if (minPlayers === null) {
        return;
    }

    for (const beatmap of usedBeatmaps.values()) {
        await assignMinimumPlayers(beatmap, minPlayers);
    }
}

/**
 * Assigns an amount of minimum players to all beatmaps.
 *
 * @param beatmap The beatmap to assign to. If omitted, the user will be prompted to pick a used beatmap.
 * @param minPlayers The amount of minimum players to assign. If omitted, the user will be prompted to enter a value.
 */
export async function assignMinimumPlayers(
    beatmap?: UsedBeatmap,
    minPlayers?: MinPlayers
): Promise<void> {
    beatmap ??= (await pickBeatmap(usedBeatmaps)) ?? undefined;

    if (!beatmap) {
        return;
    }

    minPlayers ??= (await getMinimumPlayers()) ?? undefined;

    if (minPlayers === undefined) {
        return;
    }

    const config = <Config>await import("../../config.json");

    const configBeatmapIndex = config.beatmaps.findIndex(
        (v) => v.hash === beatmap!.hash
    );

    if (configBeatmapIndex !== -1) {
        config.beatmaps[configBeatmapIndex].minPlayers = minPlayers;
    }

    await saveConfig(config);

    beatmap.minPlayers = minPlayers;
}

async function getMinimumPlayers(): Promise<MinPlayers | null> {
    const input = (
        await getInput(
            'Enter the amount of minimum players to be applied. Enter "ALL" to set to default or "q" to exit from this menu.',
            { allowBlank: false, caseSensitive: false }
        )
    ).toUpperCase();

    switch (input) {
        case "Q":
            return null;
        case "ALL":
            return input;
    }

    const minPlayers = parseInt(input);

    if (Number.isNaN(minPlayers) || minPlayers <= 0) {
        console.log("Invalid amount of minimum players");

        return getMinimumPlayers();
    }

    return minPlayers;
}
