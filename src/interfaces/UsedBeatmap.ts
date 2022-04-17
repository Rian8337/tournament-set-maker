import { Mod } from "@rian8337/osu-base";
import { FullBeatmap } from "./FullBeatmap";

/**
 * Represents a beatmap that will be used to create the tournament set.
 */
export interface UsedBeatmap extends FullBeatmap {
    /**
     * The pick ID of the beatmap.
     */
    pickId: string;

    /**
     * The portion of ScoreV1 that will be accounted for when calculating ScoreV2.
     */
    comboScorePortion: number;

    /**
     * The mods that are required to be played in this beatmap.
     */
    requiredMods: Mod[];

    /**
     * The mods that are allowed to be picked while playing this beatmap.
     */
    allowedMods: Mod[];
}
