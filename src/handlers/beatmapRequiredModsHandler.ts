import { Mod } from "@rian8337/osu-base";
import { Config } from "../interfaces/Config";
import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { pickBeatmap } from "../tools/beatmapPicker";
import { saveConfig } from "../tools/configManager";
import { getMods, usedBeatmaps } from "../tools/util";

/**
 * Assigns required mods to all beatmaps.
 */
export async function assignGloballyRequiredMods(): Promise<void> {
    const mods = await getMods();

    if (mods === null) {
        return;
    }

    for (const beatmap of usedBeatmaps.values()) {
        await assignRequiredMods(beatmap, mods);
    }
}

/**
 * Assigns required mods to a beatmap.
 *
 * @param beatmap The beatmap to assign to. If omitted, the user will be prompted to pick a used beatmap.
 * @param mods The mods to assign. If omitted, the user will be prompted to enter a combination of mods.
 */
export async function assignRequiredMods(
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

    const config = <Config>await import("../../config.json");

    // Check for collisions with allowed mods.
    for (const mod of mods) {
        const index = beatmap.allowedMods.findIndex(
            (v) => v.acronym === mod.acronym
        );

        if (index !== -1) {
            console.log(
                `${mod.acronym} is only allowed in ${beatmap.fullTitle}. Making the mod required`
            );

            beatmap.allowedMods.splice(index, 1);

            const configBeatmapIndex = config.beatmaps.findIndex(
                (v) => v.hash === beatmap!.hash
            );

            if (configBeatmapIndex !== -1) {
                config.beatmaps[configBeatmapIndex].allowedMods =
                    config.beatmaps[configBeatmapIndex].allowedMods.replace(
                        mod.acronym,
                        ""
                    );
            }
        }
    }

    const configBeatmapIndex = config.beatmaps.findIndex(
        (v) => v.hash === beatmap!.hash
    );

    if (configBeatmapIndex !== -1) {
        config.beatmaps[configBeatmapIndex].requiredMods = mods
            .map((m) => m.acronym)
            .join("");
    }

    await saveConfig(config);

    beatmap.requiredMods = mods;
}
