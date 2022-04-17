import { ConfigBeatmap } from "./ConfigBeatmap";

/**
 * Structure of the configuration file.
 */
export interface Config {
    /**
     * The ID of the pool.
     */
    poolId: string;

    /**
     * The artist of the tournament set.
     */
    artist: string;

    /**
     * The title of the tournament set.
     */
    title: string;

    /**
     * The beatmaps in the tournament set.
     */
    beatmaps: ConfigBeatmap[];
}
