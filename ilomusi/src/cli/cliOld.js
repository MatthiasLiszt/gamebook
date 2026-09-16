
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile } from "node:fs/promises";
import { Game } from "../engine/game.js";

// 1. Load data assets
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

const localeData = {
    sections: await loadJson("../../locales/en/sections.json"),
    ui: await loadJson("../../locales/en/ui.json")
};

const game = new Game(gameData, localeData);
const rl = readline.createInterface({ input, output });

game.start();

// 2. Main Game Loop
while (true) {
    console.clear();
    const sectionData = game.getCurrentSectionData();
    const { number, text, interpreted, choices } = sectionData;

    console.log(`\n--- Section ${number} ---\n`);
    if (text) console.log(text);

    // Handle Death Nodes
    if (interpreted.type === "death") {
        console.log("\n=================================");
        console.log("  Your life and mission end here.");
        console.log("=================================\n");
        break;
    }

    // Handle Automatic Goto Transitions
    if (interpreted.type === "goto") {
        console.log(`\n→ Moving to Section ${interpreted.next}...`);
        await rl.question("\nPress Enter to continue...");
        game.state.currentSection = interpreted.next;
        continue;
    }

    // Handle Combat Scenarios
    if (interpreted.type === "combat") {
        const { combat } = interpreted;
        console.log("\n=================================");
        console.log(` COMBAT: ${combat.enemy.toUpperCase()}`);
        console.log(` Enemy CS: ${combat.enemyCombatSkill} | Endurance: ${combat.enemyEndurance}`);
        console.log(` Your Combat Skill: ${combat.playerCombatSkill} (Ratio: ${combat.combatRatio})`);
        console.log("=================================");

        const combatAnswer = await rl.question("\nDid you win? (1. Yes / 2. No / 3. Evade): ");
        const resultsMap = { "1": "win", "2": "lose", "3": "evade" };
        const result = resultsMap[combatAnswer.trim()];

        if (!result) {
            console.log("Invalid selection.");
            await rl.question("Press Enter to continue...");
            continue;
        }

        try {
            const resolved = gameData.sections[number].combat;
            const next = result === "win" ? resolved.on_win : (result === "evade" ? resolved.on_evade : resolved.on_lose);
            game.state.currentSection = next;
            continue;
        } catch (err) {
            console.log(`\nError resolving combat: ${err.message}`);
            await rl.question("Press Enter to continue...");
            continue;
        }
    }

    // Handle Random Tests
    if (interpreted.type === "random_test") {
        const { result } = interpreted;
        console.log(`\n[ Random Roll: ${result.baseRoll} | Modifier: ${result.modifier} | Total: ${result.result} ]`);
        console.log(`→ Proceeding to Section ${result.outcome.next}...`);
        await rl.question("\nPress Enter to continue...");
        game.state.currentSection = result.outcome.next;
        continue;
    }

    // Handle Standard Player Choices
    if (choices.length === 0) {
        console.log("\n--- No choices available ---");
        break;
    }

    console.log();
    choices.forEach((choice, index) => {
        console.log(`${index + 1}. ${choice.text}`);
    });

    console.log();
    const answer = await rl.question("> ");
    const choiceIndex = Number(answer) - 1;

    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= choices.length) {
        console.log("\nPlease enter a valid choice number.");
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