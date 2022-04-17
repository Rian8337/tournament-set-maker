import { DatabaseEntryBeatmap } from "./DatabaseEntryBeatmap";

/**
 * Represents a JSON database entry file.
 */
export interface DatabaseEntry {
    /**
     * The ID of this tournament pool.
     */
    readonly poolId: string;

    /**
     * The beatmaps this tournament pool has.
     */
    readonly maps: DatabaseEntryBeatmap[];
}
