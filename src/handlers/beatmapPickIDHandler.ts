import { Config } from "../interfaces/Config";
import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { pickBeatmap } from "../tools/beatmapPicker";
import { saveConfig } from "../tools/configManager";
import { usedBeatmaps, getInput } from "../tools/util";

/**
 * Assigns pick IDs to all beatmaps.
 */
export async function assignPickIDs(): Promise<void> {
    for (const beatmap of usedBeatmaps.values()) {
        await assignPickID(beatmap);
    }
}

/**
 * Assigns a pick ID to a beatmap.
 *
 * @param beatmap The beatmap to assign to. If omitted, the user will be prompted to pick a used beatmap.
 */
export async function assignPickID(beatmap?: UsedBeatmap): Promise<void> {
    beatmap ??= (await pickBeatmap(usedBeatmaps)) ?? undefined;

    if (!beatmap) {
        return;
    }

    const pickId = await getInput(`Enter pick ID for ${beatmap.fullTitle}.`, {
        allowBlank: false,
    });

    const usedBeatmap = usedBeatmaps.find((v) => v.pickId === pickId);

    if (usedBeatmap) {
        console.log(
            `The pick ID ${pickId} has been used by ${usedBeatmap.fullTitle}`
        );

        return assignPickID(beatmap);
    }

    const config = <Config>await import("../../config.json");

    const configBeatmapIndex = config.beatmaps.findIndex(
        (v) => v.hash === beatmap!.hash
    );

    if (configBeatmapIndex !== -1) {
        config.beatmaps[configBeatmapIndex].pickId = pickId;
    }

    await saveConfig(config);

    beatmap.pickId = pickId;
}
