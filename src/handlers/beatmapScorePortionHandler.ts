import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { usedBeatmaps, getInput } from "../tools/util";
import { Config } from "../interfaces/Config";
import { saveConfig } from "../tools/configManager";
import { pickBeatmap } from "../tools/beatmapPicker";

/**
 * Assigns a score portion to all beatmaps.
 */
export async function assignGlobalScorePortion(): Promise<void> {
    const comboPortion = await getComboPortion();

    if (comboPortion === null) {
        return;
    }

    for (const beatmap of usedBeatmaps.values()) {
        await assignScorePortion(beatmap, comboPortion);
    }
}

/**
 * Assigns a score portion to a beatmap.
 *
 * @param beatmap The beatmap to assign to. If omitted, the user will be prompted to pick a used beatmap.
 * @param comboPortion The score portion to assign. If omitted, the user will be prompted to enter a value.
 */
export async function assignScorePortion(
    beatmap?: UsedBeatmap,
    comboPortion?: number
): Promise<void> {
    beatmap ??= (await pickBeatmap(usedBeatmaps)) ?? undefined;

    if (!beatmap) {
        return;
    }

    comboPortion ??= (await getComboPortion()) ?? undefined;

    if (comboPortion === undefined) {
        return;
    }

    const config = <Config>await import("../../config.json");

    const configBeatmapIndex = config.beatmaps.findIndex(
        (v) => v.hash === beatmap!.hash
    );

    if (configBeatmapIndex !== -1) {
        config.beatmaps[configBeatmapIndex].comboScorePortion =
            comboPortion / 100;
    }

    await saveConfig(config);

    beatmap.comboScorePortion = comboPortion / 100;
}

async function getComboPortion(): Promise<number | null> {
    const input = (
        await getInput(
            'Enter the combo score portion to be applied (in percentage), from 0 to 100 (inclusive). Enter "q" to exit from this menu.',
            { allowBlank: false, caseSensitive: false }
        )
    ).toLowerCase();

    if (input === "q") {
        return null;
    }

    const comboPortion = parseInt(input);

    if (Number.isNaN(comboPortion) || comboPortion < 0 || comboPortion > 100) {
        console.log("Invalid score portion");

        return getComboPortion();
    }

    return comboPortion;
}
