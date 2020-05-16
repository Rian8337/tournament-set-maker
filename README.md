# osu!droid Tournament Set Maker
A NodeJS script that can create mapsets for osu!droid tournaments.

### Requirements
- NodeJS (any version would do, however v12 or above (LTS) is recommended)
- A text editor that can edit JSON files

### Guide
1. Download the script and install dependencies by running `npm install` in your command line.
2. Delete placeholder files from both maps and output folder.
3. Place `.osz` files into the maps folder.
4. Open config.json and modify the fields as you like. For explanation, see the category below.
5. Run `npm run start` or `node main.js`.
6. The mapset is ready for zipping inside the maps folder. A `databaseEntry.json` file will be created if you want to enter the mapset for [Alice](https://github.com/Rian8337/Alice).

### config.json configuration
#### poolid
`poolid` is the pool's ID. This will be used if you want to enter the mapset for Alice. It's best to ask to bot creators before modifying this field.

#### artist
This field will be used as the beatmap's general artist (for example, `Various Artists`/`V.A.`/etc.).

#### title
This field will be used as the beatmap's general title (for example, `osu!droid 8th Discord Tournament`).

#### format
This field configures the beatmap ID to use for the mapset (NM1/NM2/etc), what the beatmap's beatmapset ID (this will be used to detect maps from the maps folder), and the difficulty name of the beatmap that you want to use in the mapset.
This field is crucial for the script to work, so make sure to modify accordingly.

An example of correct JSON file:
```json
{
    "poolid": "t8gf",
    "artist": "V.A.",
    "title": "osu!droid 8th Discord Tournament Grand Final",
    "format": [
        {
            "id": "NM1",
            "beatmapset_id": 1159452,
            "difficulty_name": "My Funeral"
        },
        {
            "id": "NM2",
            "beatmapset_id": 1125778,
            "difficulty_name": "Evolutionism"
        }
    ]
}
```