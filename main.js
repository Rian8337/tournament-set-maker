const AdmZip = require('adm-zip');
const osuapikey = require('./credentials.json').api_key;
const { Parser, MapStats, ModUtil } = require("@rian8337/osu-base");
const fs = require('fs');
const { MD5 } = require('crypto-js');
const { downloadBeatmap, fetchBeatmap } = require('./util');
const configure = require('./configManager');

if (!osuapikey) {
    return console.log("Please enter an osu! API key in credentials.json!");
}

process.env.OSU_API_KEY = osuapikey;

fs.readdir('./maps', async (err, files) => {
    if (err) throw err;
    await configure();
    const config = require('./config.json');

    const file_list = files.filter(file => file.endsWith(".osz"));
    if (file_list.length === 0) {
        console.warn("No beatmaps found! If you choose to download beatmaps from Sayobot, you can ignore this warning.");
    }

    const map_entries = {
        poolid: config.poolid,
        forcePR: config.forcePR,
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
            let beatmapID = beatmap.link;
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
                    } else {
                        pick += "S";
                    }
                } else {
                    pick += count;
                }
            }

            let file = file_list.find(file => file.startsWith(beatmapset_id));
            if (!file) {
                console.warn(`No beatmap file found for ${pick} with beatmapset ID ${beatmapset_id}. Downloading from Sayobot`);
                file = await downloadBeatmap(beatmapset_id);
                console.log("Download complete");
            }
            const zip = new AdmZip(`./maps/${file}`);
            const entries = zip.getEntries();
            const osuFile = entries.find(entry => new Parser().parse(entry.getData().toString("utf8")).map.version === version);
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
            const file_name = `${map_artist} - ${map_title} (${creator}) [(${pick}) ${map_object.artist} - ${map_object.title} [${map_object.version}]].osu`.replace(/[/\\?%*:|"<>]/g, "");

            let mods = "";

            switch (id) {
                case "dt":
                    mods += "DT";
                    break;
                case "hr":
                    mods += "HR";
                    break;
                case "hd":
                    mods += "HD";
                    break;
            }

            const map_entry = {
                pick: pick,
                mode: id,
                name: file_name.substring(0, file_name.length - 4).replace(/['_]/g, " "),
                maxScore: new Parser().parse(osuFile.getData().toString("utf8")).map.maxDroidScore(
                    new MapStats({ mods: ModUtil.pcStringToMods(mods) })
                ),
                hash: md5,
                duration: parseInt(map_object.total_length),
                scorePortion: beatmap.scorePortion.combo,
                accuracyPortion: beatmap.scorePortion.accuracy,
            };
            map_entries.map.push(map_entry);

            newZip.addFile(file_name, Buffer.from(lines, 'utf8'));
        }
    }

    const set_directory = `./output/${map_artist} - ${map_title}.osz`;
    console.log("Saving tournament mapset");

    newZip.writeZip(set_directory, function(err) {
        if (err) throw err;
        console.log("Tournament mapset saved");
        console.log("Creating databaseEntry.json");
        fs.writeFile('databaseEntry.json', JSON.stringify(map_entries, null, "\t"), function(err) {
            if (err) throw err;
            console.log("Done");
            process.exit(0);
        });
    });
});