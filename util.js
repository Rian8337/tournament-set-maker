const request = require('request');
const readline = require('readline');
const osuapikey = require('./credentials.json').api_key;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Fetches beatmap from osu! API.
 * 
 * @param {number} beatmap_id The beatmap ID. 
 * @returns {Promise<Object>} An object containing beatmap information.
 */
 function fetchBeatmap(beatmap_id) {
    return new Promise(resolve => {
        request(`https://osu.ppy.sh/api/get_beatmaps?k=${osuapikey}&b=${beatmap_id}`, (err, res, data) => {
            if (res.statusCode !== 200) {
                return resolve(null);
            }
            const obj = JSON.parse(data);
            if (!obj || !obj[0]) {
                return resolve(null);
            }
            if (obj[0].mode != 0) {
                console.warn("Beatmap ID", beatmap_id, "is not an osu!standard map. Ignoring beatmap");
                return resolve(null);
            }
            resolve(obj[0]);
        });
    });
}

/**
 * Asks for an input from the user.
 * 
 * @param {string} question The text to view to the user.
 * @returns {Promise<string>} The input of the user.
 */
 function askInput(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer);
        });
    });
}

/**
 * Asks the user to put the beatmap file inside maps folder.
 * 
 * @param {number} beatmapset_id The beatmap set ID.
 * @returns {Promise<string>} The beatmap's file name.
 */
function notifyMapInsert(beatmapset_id) {
    return new Promise(async resolve => {
        await askInput(`Mapset not found for beatmapset ID ${beatmapset_id}. Please insert the corresponding beatmap set to maps folder, then press Enter (note: the mapset must have the beatmapset ID in front of its name, for example: "${beatmapset_id}.osz" (without quotation marks)).\nYou can use this link to download the map from osu! website: https://osu.ppy.sh/beatmapsets/${beatmapset_id}`);
        fs.readdir('./maps', (err, files) => {
            if (err) {
                console.warn("Error opening maps directory:\n\n" + err);
                return resolve(notifyMapInsert(beatmapset_id));
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
        });
    });
}

/**
 * Asynchronously downloads beatmap set from Sayobot.
 * 
 * @param {number} beatmapset_id The beatmap set ID.
 * @returns {Promise<string>} The beatmap file name.
 */
function downloadBeatmap(beatmapset_id) {
    return new Promise(resolve => {
        let file_name = `${beatmapset_id}.osz`;
        const data_array = [];

        request(`https://txy1.sayobot.cn/beatmaps/download/novideo/${beatmapset_id}`)
            .on("data", data => {
                data_array.push(Buffer.from(data));
            })
            .on("complete", async res => {
                if (res.statusCode !== 200) {
                    file_name = await notifyMapInsert(beatmapset_id);
                    return resolve(file_name);
                }
                const result = Buffer.concat(data_array);
                fs.writeFile(`./maps/${file_name}`, result, err => {
                    if (err) throw err;
                    resolve(file_name);
                });
            });
    });
}

module.exports = {
    fetchBeatmap,
    askInput,
    notifyMapInsert,
    downloadBeatmap
};