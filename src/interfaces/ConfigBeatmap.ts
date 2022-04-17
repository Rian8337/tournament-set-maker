import { MinPlayers } from "../types/MinPlayers";

/**
 * Represents a beatmap written in configuration file.
 */
export interface ConfigBeatmap {
    /**
     * The pick ID of the beatmap.
     */
    pickId: string;

    /**
     * The name of the beatmap.
     */
    name: string;

    /**
     * The portion at which the maximum score will contribute to ScoreV2.
     */
    comboScorePortion: number;

    /**
     * The MD5 hash of the beatmap.
     */
    hash: string;

    /**
     * The combination of mods that must be used when playing this beatmap.
     */
    requiredMods: string;

    /**
     * The combination of mods that can be used when playing this beatmap.
     */
    allowedMods: string;

    /**
     * The minimum amount of players playing this pick with required mods.
     */
    minPlayers: MinPlayers;
}
