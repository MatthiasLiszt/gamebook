import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { Game } from "../engine/game.js";

const loadJson = async (relPath) => {
    const url = new URL(relPath, import.meta.url);
    return JSON.parse(await readFile(url, "utf8"));
};

const gameData = {
    sections: await loadJson("../data/sections.json"),
    items: await loadJson("../data/items.json"),
    disciplines: await loadJson("../data/disciplines.json"),
    enemies: await loadJson("../data/enemies.json")
};

// Load locales map (add additional languages as you add folders)
const localesData = {
    en: {
        sections: await loadJson("../../locales/en/sections.json"),
        ui: await loadJson("../../locales/en/ui.json")
    },
    ru: {
        sections: await loadJson("../../locales/ru/sections.json"),
        ui: await loadJson("../../locales/ru/ui.json")
    },
    toki: {
        sections: await loadJson("../../locales/toki/sections.json"),
        ui: await loadJson("../../locales/toki/ui.json")
    }
};

const game = new Game(gameData, localesData, "en");
const rl = readline.createInterface({ input, output });

game.start();

while (true) {
    console.clear();
    const sectionData = game.getCurrentSectionData();
    const { number, text, interpreted, choices } = sectionData;

    console.log(`\n--- Section ${number} --- [Lang: ${game.currentLang.toUpperCase()}]\n`);
    if (text) console.log(text);

    if (interpreted.type === "death") {
        console.log("\n=================================");
        console.log("  Your life and mission end here.");
        console.log("=================================\n");
        break;
    }

    if (interpreted.type === "goto") {
        console.log(`\n→ Moving to Section ${interpreted.next}...`);
        await rl.question("\nPress Enter to continue...");
        game.state.currentSection = interpreted.next;
        continue;
    }

    if (interpreted.type === "combat") {
        const { combat } = interpreted;
        console.log("\n=================================");
        console.log(` COMBAT: ${combat.enemy.toUpperCase()}`);
        console.log(` Enemy CS: ${combat.enemyCombatSkill} | Endurance: ${combat.enemyEndurance}`);
        console.log(` Your CS: ${combat.playerCombatSkill} (Ratio: ${combat.combatRatio})`);
        console.log("=================================");

        const combatAnswer = await rl.question("\nDid you win? (1. Yes / 2. No / 3. Evade): ");
        const resultsMap = { "1": "win", "2": "lose", "3": "evade" };
        const result = resultsMap[combatAnswer.trim()];

        if (!result) {
            console.log("Invalid selection.");
            await rl.question("Press Enter to continue...");
            continue;
        }

        const resolved = gameData.sections[number].combat;
        const next = result === "win" ? resolved.on_win : (result === "evade" ? resolved.on_evade : resolved.on_lose);
        game.state.currentSection = next;
        continue;
    }

    if (interpreted.type === "random_test") {
        const { result } = interpreted;
        console.log(`\n[ Roll: ${result.baseRoll} | Mod: ${result.modifier} | Total: ${result.result} ]`);
        console.log(`→ Proceeding to Section ${result.outcome.next}...`);
        await rl.question("\nPress Enter to continue...");
        game.state.currentSection = result.outcome.next;
        continue;
    }

    // Display standard choices
    console.log();
    choices.forEach((choice, index) => {
        console.log(`${index + 1}. ${choice.text}`);
    });

    // Display System Controls
    console.log("\n---------------------------------");
    console.log("[S] Stats | [SAVE] Save Game | [LOAD] Load Game | [L] Change Language | [Q] Quit");
    console.log("---------------------------------");

    const inputCmd = (await rl.question("> ")).trim().toLowerCase();

    // Command Handlers
    if (inputCmd === "s") {
        console.log(`\n${game.getStats()}`);
        await rl.question("\nPress Enter to return...");
        continue;
    }

    if (inputCmd === "save") {
        await writeFile(new URL("../save.json", import.meta.url), game.saveState(), "utf8");
        console.log("\nGame state saved to save.json!");
        await rl.question("Press Enter to continue...");
        continue;
    }

    if (inputCmd === "load") {
        try {
            const fileData = await readFile(new URL("../save.json", import.meta.url), "utf8");
            game.loadState(fileData);
            console.log("\nGame loaded successfully!");
        } catch {
            console.log("\nFailed to load save file.");
        }
        await rl.question("Press Enter to continue...");
        continue;
    }

    if (inputCmd === "l") {
        const targetLang = await rl.question("Enter language code (e.g., en): ");
        try {
            game.setLanguage(targetLang.trim().toLowerCase());
            console.log(`\nLanguage changed to ${targetLang.toUpperCase()}`);
        } catch (err) {
            console.log(`\n${err.message}`);
        }
        await rl.question("Press Enter to continue...");
        continue;
    }

    // Quit Command Handler
    if (inputCmd === "q") {
        console.log("\nThank you for playing! Farewell.\n");
        break; // Breaks the while(true) loop to exit cleanly
    }

    // Choice Processing
    const choiceIndex = Number(inputCmd) - 1;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= choices.length) {
        console.log("\nInvalid command or choice number.");
        await rl.question("Press Enter to continue...");
        continue;
    }

    try {
        game.choose(choiceIndex);
    } catch (error) {
        console.log(`\n${error.message}`);
        await rl.question("Press Enter to continue...");
    }
}

rl.close();