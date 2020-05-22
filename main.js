const AdmZip = require('adm-zip');
const osuapikey = require('./credentials.json').api_key;
const config = require('./config.json');
const osudroid = require('osu-droid');
const fs = require('fs');
const https = require('https');
const {MD5} = require('crypto-js');

if (!osuapikey) return console.log("Please enter an osu! API key in credentials.json!");

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

fs.readdir('./maps', async (err, files) => {
    if (err) throw err;
    const file_list = files.filter(file => file.endsWith(".osz"));
    if (file_list.length === 0) return console.warn("No beatmaps found!");

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
    const map_list = [];

    for (const id in formats) console.log(`Found ${formats[id].length} ${id.toUpperCase()} map(s)`);
    console.log(`Creating a tournament mapset with name "${map_artist} - ${map_title}.osz"\n`);

    for (const id in formats) {
        const beatmaps = formats[id];
        for await (const beatmap of beatmaps) {
            let beatmapID = beatmap;
            if (typeof beatmapID === 'string') {
                const a = beatmapID.split("/");
                beatmapID = parseInt(a[a.length - 1]);
                if (isNaN(beatmapID)) {
                    console.warn(`Invalid beatmap link: ${beatmapID}. Ignoring link`);
                    continue
                }
            }

            const map_object = await fetchBeatmap(beatmapID);
            if (!map_object) {
                console.warn(`Couldn't fetch beatmap for beatmap ID ${beatmapID}. Ignoring beatmap entry`);
                continue
            }
            const beatmapset_id = map_object.beatmapset_id;
            const artist = map_object.artist;
            const title = map_object.title;
            const creator = map_object.creator;
            const version = map_object.version;

            const i = beatmaps.findIndex(b => b === beatmap);
            const pick = `${id.toUpperCase()}${beatmaps.length > 1 ? (i+1).toString() : ""}`;

            const file = file_list.find(file => file.startsWith(beatmapset_id));
            if (!file) {
                console.warn(`No beatmap file found for mode ${pick} with beatmapset ID ${beatmapset_id}`);
                continue
            }
            const zip = new AdmZip(`./maps/${file}`);
            const entries = zip.getEntries();
            let osuFile = entries.find(entry => entry.entryName.endsWith(`[${version.replace(/[\[\]/\\?%*:|"<>]/g, "_")}].osu`));
            if (!osuFile) {
                // try to detect with lowercase if not found due to inconsistencies with .osu file saving
                osuFile = entries.find(entry => entry.entryName.toLowerCase().endsWith(`[${version.replace(/[\[\]/\\?%*:|"<>]/g, "_")}].osu`));
                if (!osuFile) {
                    console.warn(`Couldn't find beatmap file for pick ${pick}: ${version}`);
                    continue
                }
            }
            console.log(`${pick} beatmap found: ${artist} - ${title} (${creator}) [${version}]`);

            let lines = osuFile.getData().toString("utf8").split("\n");
            let musicFound = false;

            for (let i = 0; i < lines.length; ++i) {
                let line = lines[i];
                if (line.startsWith(" ") || line.startsWith("_")) continue;
                line = line.trim();
                if (line.length === 0 || line.startsWith("//")) continue;

                const p = line.split(":").map(l => l.trim());

                if (line.startsWith("AudioFilename")) {
                    const audioFile = entries.find(entry => entry.entryName === p[1]);
                    if (!audioFile) {
                        console.warn(`Couldn't find audio file for pick ${pick}. Ignoring beatmap`);
                        break
                    }
                    newZip.addFile(`${pick}.mp3`, audioFile.getData());
                    musicFound = true;
                    lines[i] = `${p[0]}: ${pick}.mp3`;
                    continue
                }

                if (line.startsWith("Title")) {
                    lines[i] = `${p[0]}:${map_title}`;
                    continue
                }

                if (line.startsWith("Artist")) {
                    lines[i] = `${p[0]}:${map_artist}`;
                    continue
                }

                if (line.startsWith("Version")) {
                    lines[i] = `${p[0]}:(${pick}) ${artist} - ${title} [${version}]`;
                    continue
                }

                if (line.startsWith("0,0")) {
                    let s = line.split(",").map(l => l.replace(/"/g, ""));
                    const file_format = s[2].substring(s[2].lastIndexOf("."));
                    const backgroundFile = entries.find(entry => entry.entryName === s[2]);
                    newZip.addFile(`${pick}${file_format}`, backgroundFile.getData());
                    s[2] = `"${pick}${file_format}"`;
                    lines[i] = s.join(",");
                    break
                }
            }

            if (!musicFound) continue;

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
                    mods = "HD"
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
            map_list.push(map_entry);

            const length_entry = [
                pick,
                map_object.total_length
            ];
            map_length_entries.map.push(length_entry);
            newZip.addFile(file_name, Buffer.from(lines, 'utf8'))
        }
    }

    const set_name = `./output/${map_artist} - ${map_title}.osz`;
    console.log("Saving beatmap");
    newZip.writeZip(set_name, function(err) {
        if (err) throw err;
        console.log("File saved");
        console.log("Creating databaseEntry1.json");

        const new_list = [];
        const modes = ['nm', 'hd', 'hr', 'dt', 'fm', 'tb'].map(m => m.toUpperCase());
        for (const mode of modes) {
            let id = 1;
            const mode_list = map_list.filter(map => map[1].includes(`[(${mode}`));
            if (mode !== 'TB') {
                while (mode_list.length > 0) {
                    const mapIndex = mode_list.findIndex(map => map[1].includes(`[(${mode}${id})`));
                    new_list.push(mode_list[mapIndex]);
                    ++id;
                    mode_list.splice(mapIndex, 1)
                }
            }
            else new_list.push(mode_list[0])
        }
        map_entries.map = new_list;

        fs.writeFile('databaseEntry1.json', JSON.stringify(map_entries), function(err) {
            if (err) throw err;
            console.log("Creating databaseEntry2.json");
            fs.writeFile('databaseEntry2.json', JSON.stringify(map_length_entries), function(err) {
                if (err) throw err;
                console.log("Done")
            })
        })
    })
})