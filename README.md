# Tournament Set Maker

A NodeJS script that can create mapsets for tournaments.

## Features

-   Automatically create mapsets for your tournament with minimal effort
-   Automatic beatmap download if you are lazy to download beatmaps (uses [Sayobot](https://osu.sayobot.cn/))
-   Easy configuration, just enter all information requested by the program and you're good to go!

## Requirements

-   [NodeJS](https://nodejs.org) v16 or above (if you don't know what version of NodeJS you have, run `node -v` in your command line)

## Guide

1. Download the script and install dependencies by running `npm install --production` in your command line.
2. (Optional) Place `.osz` files into the maps folder.
3. Run `npm start` and follow the instructions.
4. The mapset is ready to use and can be found inside the output folder. A `databaseEntry.json` file will also be created in the output folder if you want to enter the mapset for [Alice](https://github.com/Rian8337/Alice). Please ask `@Rian8337#0001` in Discord for more information if you want to do so.

## Configurations

The table below lists all available configurations offered by the tournament set maker.

| Name                | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Pool ID             | The ID of the pool.                                                                      |
| Artist              | The tournament set's artist.                                                             |
| Title               | The tournament set's title.                                                              |
| Combo Score Portion | The percentage at which the maximum score will contribute to ScoreV2 for a beatmap.      |
| Required Mods       | The combination of mods that players must use for a beatmap.                             |
| Allowed Mods        | The combination of mods that players can use for a beatmap.                              |
| Minimum Players     | The minimum amount of players required to play with required mods enabled for a beatmap. |
