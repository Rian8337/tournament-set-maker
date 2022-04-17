import { MinPlayers } from "../types/MinPlayers";

/**
 * Represents a database entry's beatmap item.
 */
export interface DatabaseEntryBeatmap {
    /**
     * The pick ID of this beatmap.
     */
    readonly pickId: string;

    /**
     * The name of this beatmap.
     */
    readonly name: string;

    /**
     * The osu!droid maximum score of this beatmap with required mods applied.
     */
    readonly maxScore: number;

    /**
     * The MD5 hash of this beatmap.
     */
    readonly hash: string;

    /**
     * The duration of this beatmap until the end of the last object, in seconds.
     */
    readonly duration: number;

    /**
     * The portion of which the maximum score will contribute to ScoreV2.
     */
    readonly scorePortion: number;

    /**
     * The combination of mods that must be used when playing this beatmap.
     */
    readonly requiredMods: string;

    /**
     * The combination of mods that can be used when playing this beatmap.
     */
    readonly allowedMods: string;

    /**
    * The minimum amount of players playing this pick with required mods.
    */
    readonly minPlayers: MinPlayers;
}
