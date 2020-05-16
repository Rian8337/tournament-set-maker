const {Parse} = require('unzipper');
const config = require('./config.json');
const osudroid = require('osu-droid');
const fs = require('fs');
const {MD5} = require('crypto-js');

fs.readdir(__dirname + "/maps", (err, files) => {
    if (err) throw err;

    files = files.filter(file => file.endsWith(".osz"));
    if (files.length === 0) return console.log("No maps found!");

    let map_entries = {
        poolid: config.poolid,
        map: []
    };

    let count = 0;
    const map_artist = config.artist;
    const map_title = config.title;
    const formats = config.format;

    files.forEach(file => {
        const beatmapset_id = parseInt(file.split(" ")[0]);
        const format = formats.find(f => f.beatmapset_id === beatmapset_id);
        if (!format) return console.log("Unable to find .osz file for following file:", file);
        const difficulty = format.difficulty_name;
        const id = format.id;

        fs.createReadStream(__dirname + '/maps/' + file)
            .pipe(Parse())
            .on('error', () => {})
            .on('entry', async entry => {
                const type = entry.type;
                if (type !== "File") return entry.autodrain();
                const fileName = entry.path;

                const content = await entry.buffer();
                if (fileName.endsWith(".mp3")) {
                    fs.writeFile(`${__dirname}/output/${id}.mp3`, content, err => {
                        if (err) throw err
                    });
                    return entry.autodrain()
                }

                const lowName = fileName.toLowerCase();
                const length = lowName.length;
                if (
                    lowName.indexOf("png", length - 3) !== -1 ||
                    lowName.indexOf("jpg", length - 3) !== -1 ||
                    lowName.indexOf("jpeg", length - 4) !== -1
                ) {
                    const file_format_length = fileName.lastIndexOf(".");
                    const file_format = fileName.substring(file_format_length);
                    fs.writeFile(`${__dirname}/output/${id}${file_format}`, content, err => {
                        if (err) throw err;
                    });
                    return entry.autodrain()
                }

                if (!fileName.endsWith(`[${difficulty}].osu`)) return entry.autodrain();
                let lines = content.toString('utf8').split("\n");

                let artist;
                let title;
                let creator;
                let version;

                for (let i = 0; i < lines.length; ++i) {
                    let line = lines[i];
                    if (line.startsWith(" ") || line.startsWith("_")) continue;
                    line = line.trim();
                    if (line.length === 0 || line.startsWith("//")) continue;
                    
                    let p = line.split(":");
                    if (line.startsWith("AudioFilename")) {
                        lines[i] = `${p[0]}: ${id}.mp3`;
                        continue
                    }
    
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
                        let s = line.split(",");
                        const file_format_length = s[2].lastIndexOf(".");
                        const file_format = s[2].substring(file_format_length);
                        s[2] = `${id}${file_format}`;
                        lines[i] = s.join(",");
                        break
                    }
                }

                lines = lines.join("\n");
                const file_name = `${map_artist} - ${map_title} (${creator}) [(${id}) ${artist} - ${title} [${version}]].osu`;
                const md5 = MD5(lines).toString();

                const map = new osudroid.Parser().parse(content.toString("utf8")).map;
                const mapinfo = new osudroid.MapInfo(map);
                const max_score = mapinfo.max_score(mods);

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

                const map_entry = [
                    mode,
                    file_name.substring(0, file_name.length - 4),
                    max_score,
                    md5
                ];
                map_entries.map.push(map_entry);

                fs.writeFile(`${__dirname}/output/${file_name}`, lines, err => {
                    if (err) throw err;
                    ++count;
                    if (count === files.length) {
                        fs.writeFile('databaseEntry.json', JSON.stringify(map_entries), err => {
                            if (err) throw err;
                            console.log("Done")
                        })
                    }
                })
            })
    })
});
