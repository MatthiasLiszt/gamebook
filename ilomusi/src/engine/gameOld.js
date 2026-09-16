import { interpret } from "./interpreter.js";

export class Game {
    constructor(gameData, localeData, randomProvider = Math.random) {
        this.data = gameData;
        this.locale = localeData;
        this.random = randomProvider;

        this.state = {
            currentSection: 1,
            combatSkill: 10,
            maxCombatSkill: 10,
            endurance: 25,
            maxEndurance: 25,
            rank: "guardian",
            disciplines: ["hunting", "sixth_sense"],
            weapons: [],
            backpack: [],
            specialItems: [],
            gold: 10,
            flags: {},
            storedEquipment: null
        };
    }

    start() {
        this.state.currentSection = 1;
    }

    getCurrentSectionData() {
        const rawNode = this.data.sections[this.state.currentSection];
        const rawLocale = this.locale.sections[this.state.currentSection];

        const context = {
            random: this.random,
            enemies: this.data.enemies,
            items: this.data.items
        };

        const interpreted = interpret(rawNode, this.state, context);

        return {
            number: this.state.currentSection,
            text: rawLocale?.text ?? "",
            interpreted,
            choices: this.getFilteredChoices(rawNode, rawLocale)
        };
    }

    getFilteredChoices(rawNode, rawLocale) {
        if (!rawNode?.choice) return [];

        return rawNode.choice
            .map(c => {
                const choiceText = rawLocale?.choices?.[c.text] ?? c.text;
                const evaluated = interpret(c, this.state, { random: this.random });
                return {
                    text: choiceText,
                    next: c.next,
                    available: evaluated.available !== false
                };
            })
            .filter(c => c.available);
    }

    choose(choiceIndex) {
        const choices = this.getFilteredChoices(
            this.data.sections[this.state.currentSection],
            this.locale.sections[this.state.currentSection]
        );

        if (choiceIndex < 0 || choiceIndex >= choices.length) {
            throw new Error("Invalid choice.");
        }

        this.state.currentSection = choices[choiceIndex].next;
    }

    getState() {
        return this.state;
    }
}