import { Beatmap } from "@rian8337/osu-base";

/**
 * Represents a loaded beatmap.
 */
export interface FullBeatmap {
    /**
     * The MD5 hash of the beatmap.
     */
    readonly hash: string;

    /**
     * The name of the beatmapset containing this beatmap.
     */
    readonly beatmapsetName: string;

    /**
     * The `.osu` file of the beatmap.
     */
    readonly file: string;

    /**
     * The full title of the beatmap.
     */
    readonly fullTitle: string;

    /**
     * The parsed beatmap.
     */
    readonly beatmap: Beatmap;
}
