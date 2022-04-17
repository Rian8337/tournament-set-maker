import Collection from "@discordjs/collection";
import AdmZip from "adm-zip";
import request from "request";
import { createInterface } from "readline";
import { writeFile } from "fs/promises";
import { FullBeatmap } from "../interfaces/FullBeatmap";
import { UsedBeatmap } from "../interfaces/UsedBeatmap";
import { Mod, ModUtil } from "@rian8337/osu-base";
import { loadBeatmapset } from "./beatmapLoader";

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

/**
 * A collection consisting of all beatmaps that have been loaded since
 * the launch of the program, mapped by beatmap hash.
 */
export const loadedBeatmaps = new Collection<string, FullBeatmap>();

/**
 * A collection consisting of all beatmaps that will be used
 * for the tournament set, mapped by beatmap hash.
 */
export const usedBeatmaps = new Collection<string, UsedBeatmap>();

/**
 * Downloads a beatmapset from Sayobot, if available.
 *
 * @param beatmapsetId The beatmapset ID to download.
 */
export function downloadBeatmap(beatmapsetId: number): Promise<void> {
    return new Promise((resolve) => {
        console.log(`Downloading beatmapset ID ${beatmapsetId}`);

        console.log();

        const dataArray: Buffer[] = [];

        request(
            `https://txy1.sayobot.cn/beatmaps/download/novideo/${beatmapsetId}`
        )
            .on("data", (chunk) => {
                dataArray.push(Buffer.from(chunk));
            })
            .on("complete", async (res) => {
                if (res.statusCode !== 200) {
                    console.log(
                        `Unable to download beatmapset ID ${beatmapsetId}: Beatmap not found`
                    );

                    return resolve();
                }

                console.log(`Downloaded beatmapset ID ${beatmapsetId}`);

                const result = Buffer.concat(dataArray);

                try {
                    loadBeatmapset(beatmapsetId.toString(), new AdmZip(result));
                } catch {
                    console.log(
                        `Unable to open downloaded beatmapset ID ${beatmapsetId}`
                    );

                    return resolve();
                }

                try {
                    await writeFile(
                        `${process.cwd()}/maps/${beatmapsetId}.osz`,
                        result
                    );

                    console.log(
                        `Saved downloaded beatmapset ID ${beatmapsetId} into maps folder`
                    );
                } catch (e) {
                    console.log(
                        `Unable to save downloaded beatmapset ID ${beatmapsetId} into maps folder: ${
                            (<Error>e).message
                        }`
                    );
                }

                resolve();
            })
            .on("error", (err) => {
                console.log(
                    `Unable to download the beatmapset ID ${beatmapsetId}: ${err.message}`
                );

                return resolve();
            });
    });
}

/**
 * Asks for an input from the user.
 *
 * @param question The text to view to the user.
 * @param validationOptions Options for input validation.
 * @returns The input of the user.
 */
export function getInput(
    question: string,
    validationOptions: {
        /**
         * Inputs that are considered valid. By default, all inputs are valid.
         */
        validInputs?: string[];

        /**
         * Whether to check for case sensitivity. Defaults to `true`.
         */
        caseSensitive?: boolean;

        /**
         * Whether to allow a blank answer. Defaults to `true`.
         */
        allowBlank?: boolean;
    } = {}
): Promise<string> {
    return new Promise((resolve) => {
        if (
            validationOptions.validInputs &&
            validationOptions.validInputs.length > 0
        ) {
            if (question) {
                question += "\n";
            }

            question += `Accepted answer(s): ${validationOptions.validInputs.join(
                ", "
            )}.`;
        }

        if (question) {
            question += "\n";
        }

        question += `Blank answer is${
            validationOptions.allowBlank === undefined ||
            validationOptions.allowBlank === true
                ? ""
                : " not"
        } allowed.\nAnswer is case ${
            validationOptions.caseSensitive === undefined ||
            validationOptions.caseSensitive === true
                ? "sensitive"
                : "insensitive"
        }.\n`;

        rl.question(question, (answer) => {
            if (
                validationOptions.validInputs &&
                validationOptions.validInputs.length > 0 &&
                (validationOptions.caseSensitive === false
                    ? !validationOptions.validInputs
                          .map((v) => v.toLowerCase())
                          .includes(answer.toLowerCase())
                    : !validationOptions.validInputs.includes(answer))
            ) {
                console.log("Invalid answer");

                console.log();

                return resolve(getInput("", validationOptions));
            }

            if (!answer && validationOptions.allowBlank === false) {
                console.log("Empty answer for this question is not permitted");

                console.log();

                return resolve(getInput("", validationOptions));
            }

            console.log();

            resolve(answer);
        });
    });
}

/**
 * Prompts the user to enter a combination of mods.
 *
 * @returns The entered mods,
 */
export async function getMods(): Promise<Mod[] | null> {
    const input = await getInput(
        'Enter the combination of mods. Enter "q" to exit from this menu.'
    );

    if (input === "q") {
        return null;
    }

    const mods = ModUtil.pcStringToMods(input);

    console.log(
        `${mods.map((m) => m.acronym).join("") || "No"} mod(s) were entered`
    );

    return mods;
}
