import { readFileSync } from "fs";
import { Game } from "../src/engine/game.js";
import { resolveCombat } from "../src/engine/combat.js";

const gameSections = JSON.parse(readFileSync(new URL("../src/data/sections.json", import.meta.url)));
const enemyDefs = JSON.parse(readFileSync(new URL("../src/data/enemies.json", import.meta.url)));

const mockGameData = {
    sections: gameSections,
    enemies: enemyDefs,
    items: {}
};

const mockLocaleData = {
    sections: {}
};

function runFuzzTest(runsCount = 1000) {
    const totalRuns = runsCount;
    let successfulRuns = 0;
    const failures = [];

    for (let run = 1; run <= runsCount; run++) {
        const game = new Game(mockGameData, mockLocaleData);
        game.start();

        const history = [];
        let isComplete = false;
        let stepCount = 0;
        const maxStepsPerGame = 150;

        while (!isComplete && stepCount < maxStepsPerGame) {
            stepCount++;
            const currentSec = game.state.currentSection;
            
            try {
                const sectionData = game.getCurrentSectionData();
                const interpreted = sectionData.interpreted;

                history.push({ section: currentSec, action: "visit" });

                if (interpreted?.combat) {
                    const combatNode = interpreted.combat;
                    
                    // Dynamically collect outcomes supported by this section
                    const possibleOutcomes = ["win", "lose"];
                    if (combatNode.canEvade || combatNode.on_evade !== undefined) {
                        possibleOutcomes.push("evade");
                    }
                    if (combatNode.canSurrender || combatNode.on_surrender !== undefined) {
                        possibleOutcomes.push("surrender");
                    }

                    const chosenOutcome = possibleOutcomes[Math.floor(Math.random() * possibleOutcomes.length)];
                    const resolution = resolveCombat(combatNode, chosenOutcome, Math.floor(Math.random() * 5) + 1);
                    
                    history.push({ 
                        section: currentSec, 
                        action: `combat_${chosenOutcome}`, 
                        next: resolution.next 
                    });

                    if (resolution.next === null) {
                        isComplete = true;
                        break;
                    }

                    game.state.currentSection = resolution.next;
                    continue;
                }

                const choices = sectionData.choices;
                if (!choices || choices.length === 0) {
                    isComplete = true;
                    break;
                }

                const choiceIdx = Math.floor(Math.random() * choices.length);
                const chosenChoice = choices[choiceIdx];

                history.push({ 
                    section: currentSec, 
                    action: `choice_${choiceIdx}`, 
                    target: chosenChoice.next 
                });

                game.choose(choiceIdx);

            } catch (err) {
                failures.push({
                    runNumber: run,
                    failedSection: currentSec,
                    errorMessage: err.message,
                    stackTrace: err.stack,
                    historySnapshot: history.slice(-5)
                });
                break;
            }
        }

        if (failures.length === 0 || failures[failures.length - 1].runNumber !== run) {
            successfulRuns++;
        }
    }

    console.log("\n==============================================");
    console.log(` FUZZ TEST REPORT (${totalRuns} Runs Executed)`);
    console.log("==============================================");
    console.log(`Successful Runs : ${successfulRuns}`);
    console.log(`Failed Runs     : ${failures.length}\n`);

    if (failures.length > 0) {
        console.log("--- TERMINATION CRASH DETAILS ---");
        
        const groupedBySection = {};
        for (const fail of failures) {
            if (!groupedBySection[fail.failedSection]) {
                groupedBySection[fail.failedSection] = [];
            }
            groupedBySection[fail.failedSection].push(fail);
        }

        for (const [section, crashList] of Object.entries(groupedBySection)) {
            console.log(`\n❌ Section ${section} [Crashed ${crashList.length} time(s)]`);
            console.log(`   Error: ${crashList[0].errorMessage}`);
            console.log(`   Recent Path: ${crashList[0].historySnapshot.map(h => `${h.section}(${h.action})`).join(" -> ")}`);
        }
    } else {
        console.log("✅ No unexpected terminations found across all 1,000 runs!");
    }
}

runFuzzTest(1000);