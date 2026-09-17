import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { Game } from "../engine/game.js";
import { loadGameData, loadLocalesData } from "./loader.js";
import { convertScript } from "../engine/script.js";
import ucsur from "./ucsur.json" with { type: "json" };
import akesi from "./akesi.json" with { type: "json" };
import junikoto from "./junikoto.json" with { type: "json" };
import sijeka from "./cjk.json" with { type: "json" };

const gameData = loadGameData(new URL("../data", import.meta.url).pathname);
const localesData = loadLocalesData(new URL("../../locales", import.meta.url).pathname);

const game = new Game(gameData, localesData, "en");
const rl = readline.createInterface({ input, output });

// String Interpolation Helper
const t = (key, vars = {}) => {
    let str = game.locale?.cliText?.[key] ?? localesData["en"]?.cliText?.[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return str;
};

game.start();

while (true) {
    console.clear();
    const sectionData = game.getCurrentSectionData(); 
    const { number, text, interpreted, choices } = sectionData; 

    console.log(`\n${t("sectionHeader", { number, lang: game.currentLang.toUpperCase() })}\n`); 
    if (text && game.getScript() === "lasina") console.log(text);
    if (text && game.getScript() === "ucsur") console.log(convertScript(text, ucsur));
    if (text && game.getScript() === "akesi") console.log(convertScript(text, akesi));
    if (text && game.getScript() === "junikoto") console.log(convertScript(text, junikoto));
    if (text && game.getScript() === "sijeka") console.log(convertScript(text, sijeka));

    if (interpreted.type === "death") {
        console.log(t("deathMessage"));
        break;
    }

    if (interpreted.type === "goto") {
        console.log(t("movingToSection", { next: interpreted.next }));
        await rl.question(t("pressEnter"));
        game.state.currentSection = interpreted.next; 
        continue;
    }

    if (interpreted.type === "combat") {
        const { combat } = interpreted; 
        console.log("\n=================================");
        console.log(t("combatHeader", { enemy: combat.enemy.toUpperCase() }));
        console.log(t("combatEnemyStats", { enemyCS: combat.enemyCombatSkill, enemyEndurance: combat.enemyEndurance }));
        console.log(t("combatPlayerStats", { playerCS: combat.playerCombatSkill, ratio: combat.combatRatio }));
        console.log("=================================");

        const combatAnswer = await rl.question(t("combatPrompt"));
        const resultsMap = { "1": "win", "2": "lose", "3": "evade" };
        const result = resultsMap[combatAnswer.trim()];

        if (!result) {
            console.log(t("invalidSelection"));
            await rl.question(t("pressEnter"));
            continue;
        }

        const resolved = gameData.sections[number].combat;
        const next = result === "win" ? resolved.on_win : (result === "evade" ? resolved.on_evade : resolved.on_lose);
        game.state.currentSection = next; 
        continue;
    }

    if (interpreted.type === "random_test") {
        const { result } = interpreted; 
        console.log(t("rollResult", { base: result.baseRoll, mod: result.modifier, total: result.result }));
        console.log(t("proceedingToSection", { next: result.outcome.next }));
        await rl.question(t("pressEnter"));
        game.state.currentSection = result.outcome.next; 
        continue;
    }

    // Display standard choices
    console.log();
    choices.forEach((choice, index) => {
        console.log(`${index + 1}. ${choice.text}`);
    });

    // Display System Controls
    console.log(`\n${t("controlsHeader")}`);
    console.log(t("controls"));
    console.log(t("controlsHeader"));

    const inputCmd = (await rl.question("> ")).trim().toLowerCase();

    // Command Handlers
    if (inputCmd === "s") {
        console.log(`\n${game.getStats()}`); 
        await rl.question(t("pressEnterReturn"));
        continue;
    }

    if (inputCmd === "save") {
        await writeFile(new URL("../save.json", import.meta.url), game.saveState(), "utf8"); 
        console.log(t("saveSuccess"));
        await rl.question(t("pressEnter"));
        continue;
    }

    if (inputCmd === "load") {
        try {
            const fileData = await readFile(new URL("../save.json", import.meta.url), "utf8");
            game.loadState(fileData); 
            console.log(t("loadSuccess"));
        } catch {
            console.log(t("loadError"));
        }
        await rl.question(t("pressEnter"));
        continue;
    }

    if (inputCmd === "l") {
        const targetLang = await rl.question(t("langPrompt"));
        try {
            game.setLanguage(targetLang.trim().toLowerCase()); 
            console.log(t("langSuccess", { lang: targetLang.toUpperCase() }));
        } catch (err) {
            console.log(`\n${err.message}`);
        }
        await rl.question(t("pressEnter"));
        continue;
    }

    if (inputCmd === "f"){
        const targetScript = await rl.question(t("scriptPrompt"));
        try {
            game.setScript(targetScript.trim().toLowerCase()); 
            console.log(t("scriptSuccess", { script: targetScript.toUpperCase() }));
        } catch (err) {
            console.log(`\n${err.message}`);
        }
        await rl.question(t("pressEnter"));
        continue;
    }

    if (inputCmd === "q") {
        console.log(t("quitMessage"));
        break;
    }

    // Choice Processing
    const choiceIndex = Number(inputCmd) - 1;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= choices.length) {
        console.log(t("invalidChoice"));
        await rl.question(t("pressEnter"));
        continue;
    }

    try {
        game.choose(choiceIndex); 
    } catch (error) {
        console.log(`\n${error.message}`);
        await rl.question(t("pressEnter"));
    }
}

rl.close();