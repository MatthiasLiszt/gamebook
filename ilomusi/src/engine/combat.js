export function startCombat(combat, state, enemies) {
    const enemy = enemies[combat.enemy];

    if (!enemy) {
        throw new Error(`Unknown enemy: ${combat.enemy}`);
    }

    // Calculate effective combat skill using enemy skill, player skill, and section/enemy modifiers
    const enemyCS = enemy.combatSkill ?? enemy.combat_skill;
    const enemyModifier = enemy.playerCombatSkillModifier ?? 0;
    const sectionModifier = combat.player_modifier ?? 0;

    const playerCombatSkill = state.combatSkill + enemyModifier + sectionModifier;
    const combatRatio = playerCombatSkill - enemyCS;

    return {
        enemy: combat.enemy,
        enemyCombatSkill: enemyCS,
        enemyEndurance: enemy.endurance,
        playerCombatSkill,
        combatRatio,
        canEvade: combat.on_evade !== undefined || combat.can_evade === true,
        canSurrender: combat.on_surrender !== undefined
    };
}

export function resolveCombat(combat, result, roundsCount = 1) {
    const validResults = ["win", "lose", "evade", "surrender"];

    if (!validResults.includes(result)) {
        throw new Error(`Invalid combat result: ${result}`);
    }

    if (result === "evade" && combat.canEvade === false && combat.on_evade === undefined) {
        throw new Error(`Combat does not allow evasion.`);
    }

    if (result === "surrender" && combat.canSurrender === false && combat.on_surrender === undefined) {
        throw new Error(`Combat does not allow surrender.`);
    }

    // Check for round-limited outcomes on win (e.g., Section 4 or Section 20)
    if (result === "win" && combat.roundOutcomes) {
        for (const outcome of combat.roundOutcomes) {
            if (outcome.maxRounds && roundsCount <= outcome.maxRounds) {
                return { result, next: outcome.on_win };
            }
            if (outcome.minRounds && roundsCount >= outcome.minRounds) {
                return { result, next: outcome.on_win };
            }
        }
    }

    const next = combat[`on_${result}`];

    if (next === undefined) {
        throw new Error(`Combat has no "${result}" outcome.`);
    }

    return { result, next };
}