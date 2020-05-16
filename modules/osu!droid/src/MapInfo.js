const mods = require('./mods');
const object_types = require('./object_types');
const Beatmap = require('./Beatmap');
const MapStats = require('./MapStats');
const Parser = require('./Parser');

class MapInfo {
    /**
     * @param {Beatmap} map The parsed beatmap from beatmap parser. 
     */
    constructor(map) {
        /**
         * @type {Beatmap|null}
         * @description The parsed beatmap from beatmap parser.
         */
        this.map = map;
    }

    /**
     * Calculates the droid maximum score of the beatmap.
     * 
     * This requires the `file` property set to `true` when retrieving beatmap general information using `MapInfo.get()`.
     *
     * @param {string} [mod] The mod string applied. This will amplify the score multiplier.
     * @returns {number} The maximum score of the beatmap. If `file` property was set to `false`, returns `0`.
     */
    max_score(mod = '') {
        if (!this.map) {
            return 0;
        }
        let stats = new MapStats(this).calculate({mode: "osu", mods: mod});
        const modbits = mods.modbits_from_string(mod);
        let diff_multiplier = 1 + stats.od / 10 + stats.hp / 10 + (stats.cs - 3) / 4;

        // score multiplier
        let score_multiplier = 1;
        if (modbits & mods.hd) score_multiplier *= 1.06;
        if (modbits & mods.hr) score_multiplier *= 1.06;
        if (modbits & mods.dt) score_multiplier *= 1.12;
        if (modbits & mods.nc) score_multiplier *= 1.12;
        if (modbits & mods.nf) score_multiplier *= 0.5;
        if (modbits & mods.ez) score_multiplier *= 0.5;
        if (modbits & mods.ht) score_multiplier *= 0.3;

        if (modbits & mods.unranked) score_multiplier = 0;

        let map = this.map;
        let objects = map.objects;
        let combo = 0;
        let score = 0;

        let tindex = -1;
        let tnext = Number.NEGATIVE_INFINITY;
        let px_per_beat = 0;
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];
            if (!(object.type & object_types.slider)) {
                score += Math.floor(300 + 300 * combo * diff_multiplier * score_multiplier / 25);
                ++combo;
                continue
            }
            while (object.time >= tnext) {
                ++tindex;
                if (map.timing_points.length > tindex + 1) {
                    tnext = map.timing_points[tindex + 1].time;
                } else {
                    tnext = Number.POSITIVE_INFINITY;
                }

                let t = map.timing_points[tindex];
                let sv_multiplier = 1.0;
                if (!t.change && t.ms_per_beat < 0) {
                    sv_multiplier = -100 / t.ms_per_beat;
                }

                if (map.format_version < 8) {
                    px_per_beat = map.sv * 100;
                } else {
                    px_per_beat = map.sv * 100 * sv_multiplier;
                }
            }
            let data = object.data;
            let num_beats = data.distance * data.repetitions / px_per_beat;
            let ticks = Math.ceil((num_beats - 0.1) / data.repetitions * map.tick_rate);

            --ticks;
            let tick_count = Math.max(0, ticks * data.repetitions);

            score += 30 * data.repetitions + 10 * tick_count;

            combo += tick_count + data.repetitions;
            score += Math.floor(300 + 300 * combo * diff_multiplier * score_multiplier / 25);
            ++combo
        }
        return score
    }
}

module.exports = MapInfo;