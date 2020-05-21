# osu!droid Tournament Set Maker
A NodeJS script that can create mapsets for osu!droid tournaments.

### Requirements
- NodeJS (any version would do, however v12 or above (LTS) is recommended)
- A text editor that can edit JSON files. For convenience, it is recommended to use an IDE/code editor such as [Visual Studio Code](https://code.visualstudio.com)

### Guide
1. Download the script and install dependencies by running `npm install` in your command line.
2. Delete placeholder files from both maps and output folder.
3. Place `.osz` files into the maps folder. Note the name of the files. Each `.osz` files must contain its beatmapset ID in the beginning of its file name.
4. Open config.json and modify the fields as you like. For explanation, see the category below.
5. Run `npm run start` or `node main.js`.
6. The mapset is ready to use and can be found inside the output folder. A `databaseEntry.json` file will be created if you want to enter the mapset for [Alice](https://github.com/Rian8337/Alice). Please ask `@Rian8337#0001` in Discord if you want to do so.

### config.json configuration
#### poolid
`poolid` is the pool's ID. This will be used if you want to enter the mapset for Alice. It's best to ask to bot creators before modifying this field.

#### artist
This field will be used as the beatmap's general artist (for example, `Various Artists`/`V.A.`/etc.).

#### title
This field will be used as the beatmap's general title (for example, `osu!droid 8th Discord Tournament`).

#### format
This field contains beatmap links that will be used to make the tournament set. All links must be in format `https://osu.ppy.sh/beatmapsets/{BEATMAPSET_ID}#osu/{BEATMAP_ID}`.

The assignment of mode index is based on the position of the beatmap link (i.e. NM1 will be the first element in `nm` array, HD2 will be the second element in `hd` array) and the amount of beatmaps in each array. For example, if `nm` array only has one beatmap, the beatmap mode will be assigned as `NM`. Conversely, each beatmap's mode will be set to `NM1`, `NM2`, etc.

An example of correct JSON file format:
```json
{
    "poolid": "t8r2",
    "artist": "V.A.",
    "title": "osu!droid 8th Discord Tournament 2nd Round",
    "format": {
        "nm": [
            "https://osu.ppy.sh/beatmapsets/310499#osu/771496",
            "https://osu.ppy.sh/beatmapsets/802214#osu/1683700",
            "https://osu.ppy.sh/beatmapsets/1011573#osu/2117268"
        ],
        "hd": [
            "https://osu.ppy.sh/beatmapsets/20871#osu/73699",
            "https://osu.ppy.sh/beatmapsets/36849#osu/119375",
            "https://osu.ppy.sh/beatmapsets/192416#osu/457590"
        ],
        "hr": [
            "https://osu.ppy.sh/beatmapsets/609189#osu/1312375",
            "https://osu.ppy.sh/beatmapsets/23907#osu/81560",
            "https://osu.ppy.sh/beatmapsets/384772#osu/930249"
        ],
        "dt": [
            "https://osu.ppy.sh/beatmapsets/39412#osu/125660",
            "https://osu.ppy.sh/beatmapsets/151033/#osu/372921",
            "https://osu.ppy.sh/beatmapsets/788087#osu/1654075"
        ],
        "fm": [
            "https://osu.ppy.sh/beatmapsets/300195#osu/673275",
            "https://osu.ppy.sh/beatmapsets/289985#osu/727715",
            "https://osu.ppy.sh/beatmapsets/617203#osu/1629264"
        ],
        "tb": [
            "https://osu.ppy.sh/beatmapsets/743650#osu/1568203"
        ]
    }
}
```