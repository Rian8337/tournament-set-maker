const AdmZip = require('adm-zip');
const config = require('./config.json');
const osudroid = require('osu-droid');
const fs = require('fs');
const {MD5} = require('crypto-js');

fs.readdir('./maps', (err, files) => {
    if (err) throw err;
    const file_list = files.filter(file => file.endsWith(".osz"));
    if (file_list.length === 0) return console.warn("No beatmaps found!");

    const map_entries = {
        poolid: config.poolid,
        map: []
    };

    const map_artist = config.artist;
    const map_title = config.title;
    const formats = config.format;
    const newZip = new AdmZip();
    const map_list = [];

    for (const id in formats) {
        const mode = formats[id];
        for (let i = 0; i < mode.length; ++i) {
            const link = mode[i];
            if (!link.includes("https://osu.ppy.sh/beatmapsets/")) {
                console.warn(`Invalid link: ${link}`);
                continue
            }

            const beatmapset_id = parseInt(link.replace("https://osu.ppy.sh/beatmapsets/", ""));
            if (isNaN(beatmapset_id)) {
                console.warn(`Invalid beatmapset ID in link ${link}`);
                continue
            }

            const a = link.split("/");
            const beatmap_id = parseInt(a[a.length - 1]);
            if (isNaN(beatmap_id)) return console.warn(`Invalid beatmap ID in link ${link}`);

            const pick = `${id.toUpperCase()}${mode.length > 1 ? (i+1).toString() : ""}`;

            const file = file_list.find(file => file.startsWith(beatmapset_id.toString()));
            if (!file) {
                console.warn(`No beatmap file found for mode ${pick}`);
                continue
            }
            const zip = new AdmZip(`./maps/${file}`);
            const entries = zip.getEntries();
            const osuEntries = entries.filter(entry => entry.entryName.endsWith(".osu"));
            let musicIsDetected = false;

            for (const entry of osuEntries) {
                let artist = '';
                let title = '';
                let creator = '';
                let version = '';
                let isCorrectMap = true;
                let lines = entry.getData().toString("utf8").split("\n");

                for (let j = 0; j < lines.length; ++j) {
                    let line = lines[j];
                    if (line.startsWith(" ") || line.startsWith("_")) continue;
                    line = line.trim();
                    if (line.length === 0 || line.startsWith("//")) continue;

                    const p = line.split(":").map(l => l.trim());

                    if (line.startsWith("AudioFilename")) {
                        if (!musicIsDetected) {
                            const audioFile = entries.find(entry => entry.entryName === p[1]);
                            newZip.addFile(`${pick}.mp3`, audioFile.getData())
                        }
                        lines[j] = `${p[0]}: ${pick}.mp3`;
                        musicIsDetected = true;
                        continue
                    }

                    // ignore non-osu!standard maps
                    if (line.startsWith("Mode") && parseInt(p[1]) !== 0) {
                        isCorrectMap = false;
                        break
                    }

                    if (line.startsWith("Title")) {
                        if (!line.includes("Unicode")) title = p[1];
                        lines[j] = `${p[0]}:${map_title}`;
                        continue
                    }

                    if (line.startsWith("Artist")) {
                        if (!line.includes("Unicode")) artist = p[1];
                        lines[j] = `${p[0]}:${map_artist}`;
                        continue
                    }

                    if (line.startsWith("Creator")) {
                        creator = p[1];
                        continue
                    }

                    if (line.startsWith("Version")) {
                        version = p[1];
                        lines[j] = `${p[0]}:(${pick}) ${artist} - ${title} [${version}]`;
                        continue
                    }

                    if (line.startsWith("BeatmapID")) {
                        const mapID = parseInt(p[1]);
                        if (mapID === beatmap_id) continue;
                        artist = title = creator = version = '';
                        isCorrectMap = false;
                        break
                    }

                    if (line.startsWith("0,0")) {
                        let s = line.split(",").map(l => l.replace(/"/g, ""));
                        const file_format = s[2].substring(s[2].lastIndexOf("."));
                        const backgroundFile = entries.find(entry => entry.entryName === s[2]);
                        newZip.addFile(`${pick}${file_format}`, backgroundFile.getData());
                        s[2] = `"${pick}${file_format}"`;
                        lines[j] = s.join(",");
                        break
                    }
                }

                if (!isCorrectMap) continue;

                lines = lines.join("\n");
                
                const md5 = MD5(lines).toString();
                const file_name = `${map_artist} - ${map_title} (${creator}) [(${pick}) ${artist.replace(/[\[\]/\\?%*:|"<>]/g, "_")} - ${title.replace(/[\[\]/\\?%*:|"<>]/g, "_")} [${version.replace(/[\[\]/\\?%*:|"<>]/g, "_")}]].osu`;

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

                const map = new osudroid.Parser().parse(entry.getData().toString("utf8")).map;
                const mapinfo = new osudroid.MapInfo(map);
                const max_score = mapinfo.max_score(mods);

                const map_entry = [
                    id,
                    file_name.substring(0, file_name.length - 4),
                    max_score,
                    md5
                ];
                map_list.push(map_entry);
                newZip.addFile(file_name, Buffer.from(lines, 'utf8'));
                break
            }
        }
    }

    const set_name = `./output/${map_artist} - ${map_title}.osz`;
    newZip.writeZip(set_name, err => {
        if (err) throw err;

        const new_list = [];
        const modes = ['nm', 'hd', 'hr', 'dt', 'fm', 'tb'].map(m => m.toUpperCase());
        for (const mode of modes) {
            let id = 1;
            const mode_list = map_list.filter(map => map[1].includes(`[(${mode}`)).map(map => map[1].replace(/'_/g, " "));
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

        fs.writeFile('databaseEntry.json', JSON.stringify(map_entries), err => {
            if (err) throw err;
            console.log("Done!")
        })
    })
})