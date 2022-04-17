import { Mod } from "@rian8337/osu-base";
import { Config } from "../interfaces/Config";
import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { pickBeatmap } from "../tools/beatmapPicker";
import { saveConfig } from "../tools/configManager";
import { getMods, usedBeatmaps } from "../tools/util";

/**
 * Assigns allowed mods to all beatmaps.
 */
export async function assignGloballyAllowedMods(): Promise<void> {
    const mods = await getMods();

    if (mods === null) {
        return;
    }

    for (const beatmap of usedBeatmaps.values()) {
        await assignAllowedMods(beatmap, mods);
    }
}

/**
 * Assigns allowed mods to a beatmap.
 *
 * @param config The current configuration state.
 * @param beatmap The beatmap to assign to. If omitted, the user will be prompted to pick a used beatmap.
 * @param mods The mods to assign. If omitted, the user will be prompted to enter a combination of mods.
 */
export async function assignAllowedMods(
    beatmap?: UsedBeatmap,
    mods?: Mod[]
): Promise<void> {
    beatmap ??= (await pickBeatmap(usedBeatmaps)) ?? undefined;

    if (!beatmap) {
        return;
    }

    mods ??= (await getMods()) ?? undefined;

    if (mods === undefined) {
        return;
    }

    const validMods: Mod[] = [];

    // Check for collisions with required mods.
    for (const mod of mods) {
        if (beatmap.requiredMods.find((v) => v.acronym === mod.acronym)) {
            console.log(
                `${mod.acronym} is required in ${beatmap.fullTitle}. Ignoring mod`
            );

            continue;
        }

        validMods.push(mod);
    }

    const config = <Config>await import("../../config.json");

    const configBeatmapIndex = config.beatmaps.findIndex(
        (v) => v.hash === beatmap!.hash
    );

    if (configBeatmapIndex !== -1) {
        config.beatmaps[configBeatmapIndex].allowedMods = validMods
            .map((m) => m.acronym)
            .join("");
    }

    await saveConfig(config);

    beatmap.allowedMods = validMods;
}
