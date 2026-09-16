import { meetsRequirement } from "./requirements.js";
import { applyEffects } from "./effects.js";
import { runRandomTest } from "./random.js";
import { startCombat, resolveCombat } from "./combat.js";

export function interpret(node, state, context) {
    if (!node) {
        return { available: false };
    }

    // Handle branching requirements (if_true / if_false)
    if (node.require && (node.require.if_true !== undefined || node.require.if_false !== undefined)) {
        const passes = meetsRequirement(node.require, state);
        const next = passes ? node.require.if_true : node.require.if_false;
        if (next !== null && next !== undefined) {
            return { available: true, type: "goto", next };
        }
    } 
    // Handle standard choice gating
    else if (node.require && !meetsRequirement(node.require, state)) {
        return { available: false };
    }

    // Support both "effect" (singular) and "effects" (plural)
    const effectsList = node.effect || node.effects;
    if (effectsList) {
        applyEffects(effectsList, state);
    }

    // Random test
    if (node.random_test) {
        return {
            available: true,
            type: "random_test",
            result: runRandomTest(node.random_test, state, context.random)
        };
    }

    // Combat: Merge node.combat properties with startCombat calculations so outcomes aren't lost
    if (node.combat) {
        const calculatedCombat = startCombat(node.combat, state, context.enemies);
        return {
            available: true,
            type: "combat",
            combat: {
                ...node.combat,
                ...calculatedCombat
            }
        };
    }

    // Death node
    if (node.death) {
        return { available: true, type: "death" };
    }

    // Ordinary navigation / Next section
    if (node.next !== undefined) {
        return {
            available: true,
            type: "goto",
            next: node.next
        };
    }

    return { available: true };
}

export function resolveCombatNode(node, result, state, roundsCount = 1) {
    if (!node.combat) {
        throw new Error("Node does not contain combat.");
    }
    return resolveCombat(node.combat, result, roundsCount);
}