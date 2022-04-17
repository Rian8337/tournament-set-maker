/**
 * Represents a beatmap written in configuration file.
 */
export interface ConfigBeatmap {
    pickId: string;
    name: string;
    comboScorePortion: number;
    hash: string;
    requiredMods: string;
    allowedMods: string;
}
