const AdmZip = require('adm-zip');
const osuapikey = require('./credentials.json').api_key;
const readline = require('readline');
const config = require('./config.json');
const osudroid = require('osu-droid');
const fs = require('fs');
const https = require('https');
const {MD5} = require('crypto-js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

if (!osuapikey) return console.log("Please enter an osu! API key in credentials.json!");

/**
 * Fetches beatmap from osu! API.
 * 
 * @param {number} beatmap_id The beatmap ID. 
 * @returns {Promise<Object>} An object containing beatmap information.
 */
function fetchBeatmap(beatmap_id) {
    return new Promise(resolve => {
        const options = new URL(`https://osu.ppy.sh/api/get_beatmaps?k=${osuapikey}&b=${beatmap_id}`);
        let content = '';

        https.get(options, res => {
            res.setEncoding("utf8");
            res.on("data", chunk => {
                content += chunk
            });
            res.on("end", () => {
                let obj;
                try {
                    obj = JSON.parse(content)
                } catch (e) {
                    console.log("Error fetching beatmap ID", beatmap_id);
                    return resolve(null);
                }
                if (!obj || !obj[0]) return resolve(null);
                if (obj[0].mode != 0) {
                    console.warn("Beatmap ID", beatmap_id, "is not an osu!standard map. Ignoring beatmap");
                    return resolve(null)
                }
                resolve(obj[0])
            })
        })
    })
}

/**
 * Asks the user to put the beatmap file inside maps folder.
 * 
 * @param {number} beatmapset_id The beatmap set ID.
 * @returns {Promise<string>} The beatmap's file name.
 */
function notifyMapInsert(beatmapset_id) {
    return new Promise(resolve => {
        rl.question(`Mapset not found for beatmapset ID ${beatmapset_id}. Please insert the corresponding beatmap set to maps folder, then press Enter (note: the mapset must have the beatmapset ID in front of its name, for example: "${beatmapset_id}.osz" (without quotation marks)).`, answer => {
            fs.readdir('./maps', (err, files) => {
                if (err) {
                    console.warn("Error opening maps directory:\n\n" + err);
                    return resolve(notifyMapInsert(beatmapset_id))
                }
                const file_list = files.filter(f => f.endsWith(".osz"));
                for (const file of file_list) {
                    if (!file.startsWith(beatmapset_id.toString())) {
                        continue;
                    }
                    const stat = fs.lstatSync(`./maps/${file}`);
                    if (stat.isDirectory()) {
                        continue;
                    }
                    console.log(`Beatmapset found: ${file}`);
                    return resolve(file);
                }
                resolve(notifyMapInsert(beatmapset_id));
            })
        })
    })
}

/**
 * Asynchronously downloads beatmap set from Bloodcat.
 * 
 * @param {number} beatmapset_id The beatmap set ID.
 * @returns {Promise<string>} The beatmap file name.
 */
function downloadBeatmap(beatmapset_id) {
    return new Promise(resolve => {
        let file_name = `${beatmapset_id}.osz`;
        const options = new URL(`https://bloodcat.com/osu/_data/beatmaps/${beatmapset_id}.osz`);
        const data_array = [];

        https.get(options, res => {
            res.on("data", chunk => {
                data_array.push(Buffer.from(chunk))
            });
            res.on("end", async () => {
                const result = Buffer.concat(data_array);
                if (result.toString("utf8").includes("File not found")) {
                    file_name = await notifyMapInsert(beatmapset_id);
                    resolve(file_name);
                } else {
                    fs.writeFile(`./maps/${file_name}`, result, err => {
                        if (err) throw err;
                        resolve(file_name);
                    })
                }
            })
        }).end()
    })
}

fs.readdir('./maps', async (err, files) => {
    if (err) throw err;
    const file_list = files.filter(file => file.endsWith(".osz"));
    if (file_list.length === 0) {
        console.warn("No beatmaps found! If you choose to download maps from Bloodcat, you can ignore this warning.");
    }

    const map_entries = {
        poolid: config.poolid,
        map: []
    };

    const map_length_entries = {
        poolid: config.poolid,
        map: []
    };

    const map_artist = config.artist;
    const map_title = config.title;
    const formats = config.format;
    const newZip = new AdmZip();
    const special_picks = config.special_picks;

    for (const id in formats) {
        console.log(`Found ${formats[id].length} ${id.toUpperCase()} map(s)`);
    }
    console.log(`Creating a tournament mapset with name "${map_artist} - ${map_title}.osz"\n`);

    for (const id in formats) {
        const beatmaps = formats[id];
        const special_pick_count = special_picks[id];
        let count = 0;
        let special_count = 0;
        
        for await (const beatmap of beatmaps) {
            let beatmapID = beatmap;
            if (typeof beatmapID === 'string') {
                const a = beatmapID.split("/");
                beatmapID = parseInt(a[a.length - 1]);
                if (isNaN(beatmapID)) {
                    console.warn(`Invalid beatmap link: ${beatmapID}. Ignoring link`);
                    continue;
                }
            }

            const map_object = await fetchBeatmap(beatmapID);
            if (!map_object) {
                console.warn(`Couldn't fetch beatmap for beatmap ID ${beatmapID}. Ignoring beatmap entry`);
                continue;
            }
            const beatmapset_id = map_object.beatmapset_id;
            const artist = map_object.artist;
            const title = map_object.title;
            const creator = map_object.creator;
            const version = map_object.version;
            ++count;

            let pick = id.toUpperCase();
            if (beatmaps.length > 1) {
                if (special_pick_count && beatmaps.length - count < special_pick_count) {
                    if (special_pick_count > 1) {
                        ++special_count;
                        pick += `S${special_count}`;
                    }
                    else {
                        pick += "S";
                    }
                }
                else {
                    pick += count;
                }
            } 

            let file = file_list.find(file => file.startsWith(beatmapset_id));
            if (!file) {
                console.warn(`No beatmap file found for ${pick} with beatmapset ID ${beatmapset_id}. Downloading from bloodcat`);
                file = await downloadBeatmap(beatmapset_id);
                console.log("Download complete");
            }
            const zip = new AdmZip(`./maps/${file}`);
            const entries = zip.getEntries();
            const osuFile = entries.find(entry => new osudroid.Parser().parse(entry.getData().toString("utf8")).map.version === version);
            if (!osuFile) {
                console.warn(`Couldn't find beatmap file for pick ${pick}: ${version}`);
                continue;
            }
            console.log(`${pick} beatmap found: ${artist} - ${title} (${creator}) [${version}]`);

            let lines = osuFile.getData().toString("utf8").split("\n");
            let musicFound = false;

            for (let i = 0; i < lines.length; ++i) {
                let line = lines[i];
                if (line.startsWith(" ") || line.startsWith("_")) {
                    continue;
                }
                line = line.trim();
                if (line.length === 0 || line.startsWith("//")) {
                    continue;
                }

                const p = line.split(":").map(l => l.trim());

                if (line.startsWith("AudioFilename")) {
                    const audioFile = entries.find(entry => entry.entryName === p[1]);
                    if (!audioFile) {
                        console.warn(`Couldn't find audio file for pick ${pick}. Ignoring beatmap`);
                        break;
                    }
                    newZip.addFile(`${pick}.mp3`, audioFile.getData());
                    musicFound = true;
                    lines[i] = `${p[0]}: ${pick}.mp3`;
                    continue;
                }

                if (line.startsWith("Title")) {
                    lines[i] = `${p[0]}:${map_title}`;
                    continue;
                }

                if (line.startsWith("Artist")) {
                    lines[i] = `${p[0]}:${map_artist}`;
                    continue;
                }

                if (line.startsWith("Version")) {
                    lines[i] = `${p[0]}:(${pick}) ${artist} - ${title} [${version}]`;
                    continue;
                }

                if (line.startsWith("0,0")) {
                    let s = line.split(",").map(l => l.replace(/"/g, ""));
                    const file_format = s[2].substring(s[2].lastIndexOf("."));
                    const backgroundFile = entries.find(entry => entry.entryName === s[2]);
                    newZip.addFile(`${pick}${file_format}`, backgroundFile.getData());
                    s[2] = `"${pick}${file_format}"`;
                    lines[i] = s.join(",");
                    break;
                }
            }

            if (!musicFound) {
                continue;
            }

            lines = lines.join("\n");
            
            const md5 = MD5(lines).toString();
            const file_name = `${map_artist} - ${map_title} (${creator}) [(${pick}) ${map_object.artist} - ${map_object.title} [${map_object.version}]].osu`;

            let mods = '';
            
            switch (id) {
                case "dt":
                    mods = "DT";
                    break;
                case "hr":
                    mods = "HR";
                    break;
                case "hd":
                    mods = "HD";
                    break;
            }

            const map = new osudroid.Parser().parse(osuFile.getData().toString("utf8")).map;
            const mapinfo = new osudroid.MapInfo(map);
            const max_score = mapinfo.max_score(mods);

            const map_entry = [
                id,
                file_name.substring(0, file_name.length - 4).replace(/['_]/g, " "),
                max_score,
                md5
            ];
            map_entries.map.push(map_entry);

            const length_entry = [
                pick,
                parseInt(map_object.total_length)
            ];
            map_length_entries.map.push(length_entry);
            newZip.addFile(file_name, Buffer.from(lines, 'utf8'))
        }
    }

    const set_directory = `./output/${map_artist} - ${map_title}.osz`;
    console.log("Saving tournament mapset");

    newZip.writeZip(set_directory, function(err) {
        if (err) throw err;
        console.log("Tournament mapset saved");
        console.log("Creating databaseEntry1.json");
        fs.writeFile('databaseEntry1.json', JSON.stringify(map_entries, null, "\t"), function(err) {
            if (err) throw err;
            console.log("Creating databaseEntry2.json");
            fs.writeFile('databaseEntry2.json', JSON.stringify(map_length_entries, null, "\t"), function(err) {
                if (err) throw err;
                console.log("Done");
                process.exit(0);
            })
        })
    })
})