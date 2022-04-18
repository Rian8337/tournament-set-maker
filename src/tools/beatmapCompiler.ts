import { MapStats, Parser } from "@rian8337/osu-base";
import { writeFile } from "fs";
import AdmZip from "adm-zip";
import { MD5 } from "crypto-js";
import { DatabaseEntry } from "../interfaces/DatabaseEntry";
import { getBeatmapAudio, getBeatmapBackground } from "./beatmapLoader";
import { usedBeatmaps } from "./util";

export async function compileBeatmap(): Promise<void> {
    console.log("Combining beatmaps into a single set");

    console.log();

    const config = await import("../../config.json");

    const { artist: setArtist, title: setTitle } = config;

    const zip = new AdmZip();

    const databaseEntry: DatabaseEntry = {
        poolId: config.poolId,
        maps: [],
    };

    for (const beatmap of usedBeatmaps.values()) {
        const { pickId, fullTitle } = beatmap;

        console.log(`Processing (${pickId}) ${fullTitle}`);

        const audioFile = getBeatmapAudio(beatmap);

        if (!audioFile) {
            console.log(
                `Could not find the audio file for (${pickId}) ${fullTitle}. Skipping beatmap`
            );

            continue;
        }

        const audioFormat = beatmap.beatmap.audioFileName.split(".")[1];

        zip.addFile(`${pickId}.${audioFormat}`, audioFile);

        const backgroundFile = getBeatmapBackground(beatmap);

        if (!backgroundFile) {
            console.log(
                `Could not find the background file for (${pickId}) ${fullTitle}. Ignoring missing background`
            );
        }

        const lines = beatmap.file.split("\n");

        for (let i = 0; i < lines.length; ++i) {
            let line = lines[i];

            if (line.startsWith(" ") || line.startsWith("_")) {
                continue;
            }

            line = line.trim();

            if (line.length === 0 || line.startsWith("//")) {
                continue;
            }

            const p = line.split(":").map((l) => l.trim());

            switch (p[0]) {
                case "AudioFilename":
                    lines[i] = `${p[0]}: ${pickId}.mp3`;
                    break;
                case "Title":
                case "TitleUnicode":
                    lines[i] = `${p[0]}:${setTitle}`;
                    break;
                case "Artist":
                case "ArtistUnicode":
                    lines[i] = `${p[0]}:${setArtist}`;
                    break;
                case "Version":
                    lines[
                        i
                    ] = `${p[0]}:(${pickId}) ${beatmap.beatmap.artist} - ${beatmap.beatmap.title} [${beatmap.beatmap.version}]`;
                    break;
            }

            if (line.startsWith("0,0")) {
                if (backgroundFile) {
                    const s = line.split(",").map((l) => l.replace(/"/g, ""));

                    const fileFormat =
                        beatmap.beatmap.backgroundFileName.split(".")[1];

                    const newBackgroundFileName = `${pickId}.${fileFormat}`;

                    s[2] = `"${newBackgroundFileName}"`;

                    zip.addFile(newBackgroundFileName, backgroundFile);

                    lines[i] = s.join(",");
                }

                break;
            }
        }

        const finalBeatmapFile = lines.join("\n");

        const fileName =
            `${setArtist} - ${setTitle} (${beatmap.beatmap.creator}) [(${pickId}) ${beatmap.beatmap.artist} - ${beatmap.beatmap.title} [${beatmap.beatmap.version}]].osu`.replace(
                /[/\\?%*:|"<>]/g,
                ""
            );

        zip.addFile(fileName, Buffer.from(finalBeatmapFile));

        const finalBeatmap = new Parser().parse(
            finalBeatmapFile,
            beatmap.requiredMods
        ).map;

        databaseEntry.maps.push({
            pickId: pickId,
            name: fileName,
            maxScore: finalBeatmap.maxDroidScore(
                new MapStats({ mods: beatmap.requiredMods })
            ),
            hash: MD5(finalBeatmapFile).toString(),
            originalHash: beatmap.hash,
            duration:
                (finalBeatmap.objects.at(-1)!.endTime -
                    Math.min(0, finalBeatmap.objects.at(0)!.startTime)) /
                1000,
            scorePortion: beatmap.comboScorePortion,
            requiredMods: beatmap.requiredMods.map((m) => m.acronym).join(""),
            allowedMods: beatmap.allowedMods.map((m) => m.acronym).join(""),
            minPlayers: beatmap.minPlayers,
        });
    }

    console.log();

    return new Promise((resolve) => {
        console.log("Saving tournament set");

        zip.writeZip(
            `${process.cwd()}/output/${setArtist} - ${setTitle}.osz`,
            async (err) => {
                if (err) {
                    console.log(
                        `Couldn't save tournament set to disk: ${err.message}`
                    );

                    return resolve();
                }

                console.log("Successfully created tournament set");

                console.log();

                console.log("Creating databaseEntry.json");

                writeFile(
                    `${process.cwd()}/output/databaseEntry.json`,
                    JSON.stringify(databaseEntry, null, "\t"),
                    (err) => {
                        if (err) {
                            console.log(
                                `Couldn't save databaseEntry.json to disk: ${err.message}`
                            );

                            return resolve();
                        }

                        console.log("Successfully created databaseEntry.json");

                        console.log();

                        console.log("Tournament set creation finished");

                        resolve();
                    }
                );
            }
        );
    });
}
