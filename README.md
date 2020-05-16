# osu!droid Tournament Set Maker
A NodeJS script that can create mapsets for osu!droid tournaments.

### Requirements
- NodeJS (any version would do, however above v10 is recommended)
- A text editor that can edit JSON files

### Guide
1. Download the script and install dependencies by running `npm install` in your command line.
2. Place a `.osz` file into the directory of the script.
3. Open config.json and modify the fields as you like.
4. Run `npm run start` or `node main.js` and you should get the mp3 file, the edited `.osu` file, and the map's background inside `output` folder. The `.osu` file's MD5 hash will be printed to your command line.

#### Warning!
The script can only process one beatmap at a time. Once you're done processing a beatmap, remove it from the directory and place another beatmap file.

### TO-DO
- Add JSON output to insert directly to database for [Alice](https://github.com/Rian8337/Alice).
