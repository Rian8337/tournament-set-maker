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

    let count = 0;
    const map_artist = config.artist;
    const map_title = config.title;
    const formats = config.format;
    const newZip = new AdmZip();

    file_list.forEach(file => {
        const beatmapset_id = parseInt(file.split(" ")[0]);

        const format = formats.find(f => f.beatmapset_id === beatmapset_id);
        if (!format) return console.warn("Unable to find matching beatmap set ID for the following file:", file);

        // provided that Windows is used
        const difficulty = format.difficulty_name.replace(/[\[\]/\\?%*:|"<>]/g, "_");
        const id = format.id.toUpperCase();

        const zip = new AdmZip(`./maps/${file}`);
        const entries = zip.getEntries();
        const osuEntries = entries.filter(entry => entry.entryName.endsWith(".osu"));

        for (const entry of osuEntries) {
            const fileName = entry.entryName;
            if (!fileName.endsWith(`[${difficulty}].osu`)) continue;

            let artist = '';
            let title = '';
            let creator = '';
            let version = '';
            let lines = entry.getData().toString("utf8").split("\n");

            for (let i = 0; i < lines.length; ++i) {
                let line = lines[i];
                if (line.startsWith(" ") || line.startsWith("_")) continue;
                line = line.trim();
                if (line.length === 0 || line.startsWith("//")) continue;

                const p = line.split(":").map(l => l.trim());

                if (line.startsWith("AudioFilename")) {
                    const audioFile = entries.find(entry => entry.entryName === p[1]);
                    newZip.addFile(`${id}.mp3`, audioFile.getData());
                    lines[i] = `${p[0]}: ${id}.mp3`;
                    continue
                }

                // ignore non-osu!standard maps
                if (line.startsWith("Mode") && parseInt(p[1]) !== 0) continue;

                if (line.startsWith("Title")) {
                    if (!line.includes("Unicode")) title = p[1];
                    lines[i] = `${p[0]}:${map_title}`;
                    continue
                }

                if (line.startsWith("Artist")) {
                    if (!line.includes("Unicode")) artist = p[1];
                    lines[i] = `${p[0]}:${map_artist}`;
                    continue
                }

                if (line.startsWith("Creator")) {
                    creator = p[1];
                    continue
                }

                if (line.startsWith("Version")) {
                    version = p[1];
                    lines[i] = `${p[0]}:(${id}) ${artist} - ${title} [${version}]`;
                    continue
                }

                if (line.startsWith("0,0")) {
                    let s = line.split(",").map(l => l.replace(/"/g, ""));
                    const file_format = s[2].substring(s[2].lastIndexOf("."));
                    const backgroundFile = entries.find(entry => entry.entryName === s[2]);
                    newZip.addFile(`${id}${file_format}`, backgroundFile.getData());
                    s[2] = `"${id}${file_format}"`;
                    lines[i] = s.join(",");
                    break
                }
            }

            lines = lines.join("\n");
            
            const md5 = MD5(lines).toString();
            const file_name = `${map_artist} - ${map_title} (${creator}) [(${id}) ${artist} - ${title} [${version}]].osu`;

            let mods = '';
            let mode;
            
            switch (id.substr(0, 2).toLowerCase()) {
                case "dt":
                    mods = "DT";
                    mode = 'dt';
                    break;
                case "hr":
                    mods = "HR";
                    mode = 'hr';
                    break;
                case "hd":
                    mods = "HD";
                    mode = 'hd';
                    break;
                case "nm":
                    mode = 'nm';
                    break;
                case "fm":
                    mode = 'fm';
                    break;
                case "tb":
                    mode = 'tb'
            }

            const map = new osudroid.Parser().parse(entry.getData().toString("utf8")).map;
            const mapinfo = new osudroid.MapInfo(map);
            const max_score = mapinfo.max_score(mods);

            const map_entry = [
                mode,
                file_name.substring(0, file_name.length - 4),
                max_score,
                md5
            ];
            map_entries.map.push(map_entry);

            newZip.addFile(file_name, Buffer.from(lines, 'utf8'));
            break
        }

        ++count;
        if (count !== file_list.length) return;

        const set_name = `./output/${map_artist} - ${map_title}.osz`;
        newZip.writeZip(set_name, err => {
            if (err) throw err;

            fs.writeFile('databaseEntry.json', JSON.stringify(map_entries), err => {
                if (err) throw err;
                console.log("Done!")
            })
        })
    })
})