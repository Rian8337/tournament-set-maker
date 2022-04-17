import { compileBeatmap } from "./tools/beatmapCompiler";
import { loadBeatmapsets } from "./tools/beatmapLoader";
import { initConfiguration } from "./tools/configManager";

(async () => {
    await loadBeatmapsets();

    await initConfiguration();

    await compileBeatmap();

    process.exit();
})();
