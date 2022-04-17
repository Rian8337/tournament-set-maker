import Collection from "@discordjs/collection";
import { Utils } from "@rian8337/osu-base";
import { FullBeatmap } from "../interfaces/FullBeatmap";
import { getInput } from "./util";

const maxItemsPerPage = 20;

/**
 * Asks the user to pick a beatmap.
 *
 * @param beatmaps The collection of beatmaps to pick from.
 * @returns The picked beatmap, `null` if the user didn't pick any.
 */
export async function pickBeatmap<T extends FullBeatmap>(
    beatmaps: Collection<string, T>
): Promise<T | null> {
    if (beatmaps.size === 0) {
        return null;
    }

    const options = {
        page: 1,
        index: 0,
    };

    if (!(await doPagingAction(beatmaps, options))) {
        return null;
    }

    const beatmap = await doSinglePickAction(beatmaps, options);

    if (beatmap === null) {
        return null;
    }

    console.log(`${beatmap.fullTitle} has been picked`);

    console.log();

    return beatmap;
}

/**
 * Asks the user to pick multiple beatmaps.
 *
 * @param beatmaps The collection of beatmaps to pick from.
 * @returns The picked beatmaps.
 */
export async function pickBeatmaps<T extends FullBeatmap>(
    beatmaps: Collection<string, T>
): Promise<Collection<string, T>> {
    let cumulativePickedBeatmaps = new Collection<string, T>();

    if (beatmaps.size === 0) {
        return cumulativePickedBeatmaps;
    }

    const options = {
        page: 1,
        index: 0,
    };

    while (true) {
        const availableBeatmaps = beatmaps.difference(cumulativePickedBeatmaps);

        if (
            availableBeatmaps.size === 0 ||
            !(await doPagingAction(availableBeatmaps, options))
        ) {
            break;
        }

        const pickedBeatmaps = await doMultiplePickAction(
            availableBeatmaps,
            options
        );

        if (pickedBeatmaps.size === 0) {
            break;
        }

        cumulativePickedBeatmaps = cumulativePickedBeatmaps.merge(
            pickedBeatmaps,
            (x) => ({ keep: true, value: x }),
            (y) => ({ keep: true, value: y }),
            (x) => ({ keep: true, value: x })
        );

        // If there is only 1 page, the user don't need to do paging anymore after
        // they quit the pick action, so we can safely break the loop here.
        if (availableBeatmaps.size < maxItemsPerPage) {
            break;
        }
    }

    return cumulativePickedBeatmaps;
}

function printBeatmaps(
    beatmaps: Collection<string, FullBeatmap>,
    options: {
        page: number;
        index: number;
    }
): void {
    options.index = maxItemsPerPage * (options.page - 1);

    while (options.index > beatmaps.size) {
        options.index -= maxItemsPerPage;

        --options.page;
    }

    console.log(`Page ${options.page}`);

    for (
        let i = 1;
        options.index <
        Math.min(
            beatmaps.size,
            maxItemsPerPage + maxItemsPerPage * (options.page - 1)
        );
        ++i, ++options.index
    ) {
        const beatmap = beatmaps.at(options.index)!;

        console.log(`${i}. ${beatmap.fullTitle}`);
    }

    console.log();
}

/**
 * Called when a beatmap collection has more than maxItemsPerPage entries to give the option for the user to page.
 *
 * @param beatmaps The beatmap collection.
 * @param options Paging options.
 * @returns `true` if the user wants to pick beatmap(s), `false` if the user wants to exit the menu.
 */
async function doPagingAction<T extends FullBeatmap>(
    beatmaps: Collection<string, T>,
    options: {
        page: number;
        index: number;
    }
): Promise<boolean> {
    if (beatmaps.size < maxItemsPerPage) {
        return true;
    }

    while (true) {
        printBeatmaps(beatmaps, options);

        const acceptedInputs = [];

        if (options.index < maxItemsPerPage) {
            acceptedInputs.push("pa");
        }

        acceptedInputs.push("pi", "q");

        if (
            options.index % maxItemsPerPage === 0 &&
            options.index !== beatmaps.size
        ) {
            acceptedInputs.push("n");
        }

        const input = (
            await getInput(
                "Choose the action that you want to do.\n" +
                    'Use "pa" to go to the previous page, "pi" to select beatmap(s) in this page, "q" to exit from this menu, or "n" to go to the next page.',
                {
                    caseSensitive: false,
                    allowBlank: false,
                    validInputs: acceptedInputs,
                }
            )
        ).toLowerCase();

        switch (input) {
            case "pa":
                options.page = Math.max(1, options.page - 1);
                break;
            case "n":
                ++options.page;
                break;
            case "q":
                return false;
            case "pi":
                return true;
        }
    }
}

/**
 * Prompts the user to choose a beatmap.
 *
 * @param beatmaps The collection of beatmaps to pick from.
 * @param options Paging options.
 * @returns The picked beatmap, `null` if the user didn't pick anything.
 */
async function doSinglePickAction<T extends FullBeatmap>(
    beatmaps: Collection<string, T>,
    options: {
        page: number;
        index: number;
    }
): Promise<T | null> {
    printBeatmaps(beatmaps, options);

    const input = (
        await getInput(
            'Enter the number of the beatmap that you want to pick. Enter "q" to exit from this menu.',
            {
                allowBlank: false,
                caseSensitive: false,
                validInputs: [
                    ...Utils.initializeArray(
                        options.index -
                            maxItemsPerPage *
                                Math.floor(options.index / maxItemsPerPage),
                        1
                    ).map((v, i) => (v + i).toString()),
                    "q",
                ],
            }
        )
    ).toLowerCase();

    if (input === "q") {
        return null;
    }

    return beatmaps.at(
        options.index - (options.index % maxItemsPerPage) + parseInt(input) - 1
    )!;
}

/**
 * Prompts the user to choose multiple beatmaps.
 *
 * @param beatmaps The collection of beatmaps to pick from.
 * @param options Paging options.
 * @returns The picked beatmaps.
 */
async function doMultiplePickAction<T extends FullBeatmap>(
    beatmaps: Collection<string, T>,
    options: {
        page: number;
        index: number;
    }
): Promise<Collection<string, T>> {
    const pickedBeatmaps = new Collection<string, T>();

    while (true) {
        const availableBeatmaps = beatmaps.difference(pickedBeatmaps);

        if (availableBeatmaps.size === 0) {
            break;
        }

        printBeatmaps(availableBeatmaps, options);

        const input = (
            await getInput(
                'Enter the number of beatmaps that you want to pick, separated by space (e.g. 1 2 3 5). Enter "q" to exit from this menu.',
                {
                    allowBlank: false,
                    caseSensitive: false,
                }
            )
        ).toLowerCase();

        if (input === "q") {
            break;
        }

        const pickedBeatmapIndexes = input
            .split(/\s+/g)
            .map((v) => parseInt(v));

        if (
            pickedBeatmapIndexes.some(Number.isNaN) ||
            pickedBeatmapIndexes.some(
                (m) =>
                    m <= 0 ||
                    m >
                        options.index -
                            maxItemsPerPage *
                                Math.floor(options.index / maxItemsPerPage)
            )
        ) {
            console.log("Some entered numbers are not valid");

            console.log();

            continue;
        }

        for (const pickedIndex of pickedBeatmapIndexes) {
            const beatmap = availableBeatmaps.at(
                options.index -
                    (options.index % maxItemsPerPage) +
                    pickedIndex -
                    1
            )!;

            console.log(`${beatmap.fullTitle} has been picked`);

            pickedBeatmaps.set(beatmap.hash, beatmap);
        }

        console.log();
    }

    return pickedBeatmaps;
}
