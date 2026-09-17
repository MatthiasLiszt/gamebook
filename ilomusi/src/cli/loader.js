import fs from "fs";
import path from "path";

function loadBatchesFromDir(dirPath) {
    if (!fs.existsSync(dirPath)) return {};

    const files = fs.readdirSync(dirPath);
    const combined = {};

    files
        .filter(file => /^batch\d+\.json$/.test(file))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0], 10);
            const numB = parseInt(b.match(/\d+/)[0], 10);
            return numA - numB;
        })
        .forEach(file => {
            const filePath = path.join(dirPath, file);
            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            Object.assign(combined, content);
        });

    return combined;
}

export function loadGameData(baseDataDir = "./src/data") {
    const itemsPath = path.join(baseDataDir, "items.json");
    const enemiesPath = path.join(baseDataDir, "enemies.json");
    const disciplinesPath = path.join(baseDataDir, "disciplines.json");

    const items = fs.existsSync(itemsPath) ? JSON.parse(fs.readFileSync(itemsPath, "utf-8")) : {};
    const enemies = fs.existsSync(enemiesPath) ? JSON.parse(fs.readFileSync(enemiesPath, "utf-8")) : {};
    const disciplines = fs.existsSync(disciplinesPath) ? JSON.parse(fs.readFileSync(disciplinesPath, "utf-8")) : {};

    const sections = loadBatchesFromDir(path.join(baseDataDir, "sections"));

    return { items, enemies, disciplines, sections };
}

export function loadLocalesData(localesBaseDir = "./locales") {
    if (!fs.existsSync(localesBaseDir)) return {};

    const languages = fs.readdirSync(localesBaseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const locales = {};

    for (const lang of languages) {
        const langDir = path.join(localesBaseDir, lang);
        
        const uiPath = path.join(langDir, "ui.json");
        const cliPath = path.join(langDir, "clitext.json");
        const itemsPath = path.join(langDir, "items.json");
        const enemiesPath = path.join(langDir, "enemies.json");
        const disciplinesPath = path.join(langDir, "disciplines.json");

        const ui = fs.existsSync(uiPath) ? JSON.parse(fs.readFileSync(uiPath, "utf-8")) : {};
        const cliText = fs.existsSync(cliPath) ? JSON.parse(fs.readFileSync(cliPath, "utf-8")) : {};
        const items = fs.existsSync(itemsPath) ? JSON.parse(fs.readFileSync(itemsPath, "utf-8")) : {};
        const enemies = fs.existsSync(enemiesPath) ? JSON.parse(fs.readFileSync(enemiesPath, "utf-8")) : {};
        const disciplines = fs.existsSync(disciplinesPath) ? JSON.parse(fs.readFileSync(disciplinesPath, "utf-8")) : {};

        const sections = loadBatchesFromDir(path.join(langDir, "sections"));

        locales[lang] = { ui, cliText, items, enemies, disciplines, sections };
    }

    return locales;
}