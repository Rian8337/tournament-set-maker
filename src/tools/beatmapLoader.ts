import { Parser } from "@rian8337/osu-base";
import AdmZip from "adm-zip";
import { MD5 } from "crypto-js";
import { readdir } from "fs/promises";
import { FullBeatmap } from "../interfaces/FullBeatmap";
import { loadedBeatmaps } from "./util";

/**
 * Loads all beatmapsets in the `maps` folder.
 */
export async function loadBeatmapsets(): Promise<void> {
    console.log("Loading beatmapsets from maps folder");

    console.log();

    const files = await readdir(`${process.cwd()}/maps`);

    for (const file of files) {
        if (!file.endsWith(".osz")) {
            continue;
        }

        try {
            const zip = new AdmZip(`${process.cwd()}/maps/${file}`);

            loadBeatmapset(file, zip);
        } catch {
            console.log(
                `An error occurred when trying to load ${file} beatmapset. Skipping`
            );
        }
    }

    if (files.length > 0) {
        console.log();
    }

    console.log(`Loaded ${loadedBeatmaps.size} beatmaps`);

    console.log();
}

/**
 * Loads a beatmapset.
 *
 * @param beatmapsetName The name of the beatmapset.
 * @param beatmapset The beatmapset to load.
 */
export function loadBeatmapset(
    beatmapsetName: string,
    beatmapset: AdmZip
): void {
    console.log(`Beatmapset ${beatmapsetName} loaded. Loading beatmaps`);

    for (const entry of beatmapset.getEntries()) {
        if (!entry.entryName.endsWith(".osu")) {
            continue;
        }

        const beatmapData = entry.getData().toString("utf8");

        const beatmap = new Parser().parse(beatmapData).map;

        const hash = MD5(beatmapData).toString();

        if (!loadedBeatmaps.has(hash)) {
            loadedBeatmaps.set(hash, {
                hash: hash,
                beatmap: beatmap,
                beatmapsetName: beatmapsetName,
                fullTitle: `${beatmap.artist} - ${beatmap.title} (${beatmap.creator}) [${beatmap.version}]`,
                file: beatmapData,
            });
        }

        console.log(
            `${beatmap.artist} - ${beatmap.title} (${beatmap.creator}) [${beatmap.version}] loaded`
        );
    }
}

/**
 * Gets the audio file of a beatmapset.
 *
 * @param beatmap The beatmap that contains the beatmapset.
 * @returns The audio file of the beatmapset, `null` if not found.
 */
export function getBeatmapAudio(beatmap: FullBeatmap): Buffer | null {
    const zip = new AdmZip(`${process.cwd()}/maps/${beatmap.beatmapsetName}`);

    for (const entry of zip.getEntries()) {
        if (entry.entryName === beatmap.beatmap.audioFileName) {
            return entry.getData();
        }
    }

    return null;
}

/**
 * Gets the background file of a beatmapset.
 *
 * @param beatmap The beatmap that contains the beatmapset.
 * @returns The background file of the beatmapset, `null` if not found.
 */
export function getBeatmapBackground(beatmap: FullBeatmap): Buffer | null {
    const zip = new AdmZip(`${process.cwd()}/maps/${beatmap.beatmapsetName}`);

    for (const entry of zip.getEntries()) {
        if (entry.entryName === beatmap.beatmap.backgroundFileName) {
            return entry.getData();
        }
    }

    return null;
}
