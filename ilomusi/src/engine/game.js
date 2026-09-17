import { interpret } from "./interpreter.js";

export class Game {
    constructor(gameData, localesData, currentLang = "en", randomProvider = Math.random) {
        this.data = gameData;
        this.locales = localesData; // Object containing all language maps: { en: {...}, es: {...} }
        this.currentLang = currentLang;
        this.locale = localesData[currentLang] ?? localesData["en"];
        this.random = randomProvider;
        this.currentScript = "lasina";

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

    // Dynamic Language Switcher
    setLanguage(langCode) {
        if (!this.locales[langCode]) {
            throw new Error(`Locale '${langCode}' not loaded.`);
        }
        this.currentLang = langCode;
        this.locale = this.locales[langCode];
    }

    // Dynamic Script Switcher
    setScript(scriptCode) {
        this.currentScript = scriptCode;
        this.currentLang = "toki";
        this.locale = this.locales["toki"];
    }

    getScript(){
        return this.currentScript;
    }

    // State Persistence
    saveState() {
        return JSON.stringify(this.state);
    }

    loadState(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (typeof parsed !== "object" || parsed === null) throw new Error();
            this.state = { ...this.state, ...parsed };
            return true;
        } catch {
            throw new Error("Invalid save file structure.");
        }
    }

    // Formatted Player Stats
    getStats() {
        const ui = this.locale.ui?.stats || {};
        return [
            `--- ${ui.title || "PLAYER CHARACTER SHEET"} ---`,
            `${ui.rank || "Rank"}: ${this.state.rank}`,
            `${ui.combatSkill || "Combat Skill"}: ${this.state.combatSkill}/${this.state.maxCombatSkill}`,
            `${ui.endurance || "Endurance"}: ${this.state.endurance}/${this.state.maxEndurance}`,
            `${ui.gold || "Gold"}: ${this.state.gold}`,
            `${ui.disciplines || "Disciplines"}: ${this.state.disciplines.join(", ") || "None"}`,
            `${ui.weapons || "Weapons"}: ${this.state.weapons.join(", ") || "None"}`,
            `${ui.backpack || "Backpack Items"}: ${this.state.backpack.join(", ") || "Empty"}`,
            `${ui.specialItems || "Special Items"}: ${this.state.specialItems.join(", ") || "None"}`
        ].join("\n");
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