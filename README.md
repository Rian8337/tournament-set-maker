# osu!droid Tournament Set Maker

A NodeJS script that can create mapsets for osu!droid tournaments.

### Features

-   Automatically create mapsets for your tournament with minimal effort
-   Automatic beatmap download if you are lazy to download beatmaps (uses [Sayobot](https://osu.sayobot.cn/))
-   Easy configuration, just enter all information requested by the program and you're good to go!

### Requirements

-   [NodeJS](https://nodejs.org) v16 or above
-   osu! API key (if you don't have one, get it from [here](https://old.ppy.sh/p/api/))

### Guide

1. Download the script and install dependencies by running `npm install` in your command line.
2. Delete placeholder files from both maps and output folder.
3. Open credentials.json and paste in your osu! API key into the `api_key` field.
4. (Optional) Place `.osz` files into the maps folder. Note the name of the files. Each `.osz` files must contain its beatmapset ID in the beginning of its file name. If this step is skipped, each map will be downloaded from Sayobot.
5. Run `npm run start` or `node main.js` and follow the instructions.
6. The mapset is ready to use and can be found inside the output folder. A `databaseEntry.json` file will be created if you want to enter the mapset for [Alice](https://github.com/Rian8337/Alice). Please ask `@Rian8337#0001` in Discord for more information if you want to do so.
