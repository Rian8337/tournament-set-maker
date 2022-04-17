import { ConfigBeatmap } from "./ConfigBeatmap";

/**
 * Structure of the configuration file.
 */
export interface Config {
    poolId: string;
    artist: string;
    title: string;
    beatmaps: ConfigBeatmap[];
}
