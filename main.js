const unzipper = require('unzipper');
const config = require('./config.json');
const fs = require('fs');
const {MD5} = require('crypto-js');

const difficulty = config.difficulty_name;

fs.readdir(__dirname, (err, files) => {
    if (err) return console.log("Error: No such directory exists");

    const file = files.find(file => file.endsWith(".osz"));
    if (!file) return console.log("Error: No osz file found!");

    fs.createReadStream(file)
        .pipe(unzipper.Parse())
        .on("entry", async entry => {
            const type = entry.type;
            if (type !== 'File') return entry.autodrain();

            const fileName = entry.path;
            const content = await entry.buffer();
            if (fileName.endsWith(".mp3")) {
                fs.writeFile(`${__dirname}/output/${config.mode}.mp3`, content, err => {
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
                fs.writeFile(`${__dirname}/output/${config.mode}${file_format}`, content, err => {
                    if (err) throw err;
                });
                return entry.autodrain()
            }

            if (!fileName.endsWith(`[${difficulty}].osu`)) return entry.autodrain();
            const map = content.toString("utf8");
            let lines = map.split("\n");

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
                    lines[i] = `${p[0]}: ${config.difficulty_name}.mp3`;
                    continue
                }

                if (line.startsWith("Title")) {
                    title = p[1];
                    lines[i] = `${p[0]}:${config.title}`;
                    continue
                }

                if (line.startsWith("Artist")) {
                    artist = p[1];
                    lines[i] = `${p[0]}:${config.artist}`;
                    continue
                }

                if (line.startsWith("Creator")) {
                    creator = p[1];
                    continue
                }

                if (line.startsWith("Version")) {
                    version = p[1];
                    lines[i] = `${p[0]}:(${config.mode}) ${artist} - ${title} [${version}]`;
                    continue
                }

                if (line.startsWith("0,0")) {
                    let s = line.split(",");
                    const file_format_length = s[2].lastIndexOf(".");
                    const file_format = s[2].substring(file_format_length);
                    s[2] = `${config.mode}${file_format}`;
                    lines[i] = s.join(",");
                    break
                }
            }

            lines = lines.join("\n");
            const file_name = `${config.artist} - ${config.title} (${creator}) [(${config.mode}) ${artist} - ${title} [${version}]].osu`;
            const md5 = MD5(lines);
            fs.writeFile(`${__dirname}/output/${file_name}`, lines, err => {
                if (err) throw err;
                console.log("Done");
                console.log("The map's MD5 hash value is " + md5)
            })
        })
});