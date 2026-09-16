import { meetsRequirement } from "./requirements.js";

export function runRandomTest(test, state, random = Math.random) {
    // Lone Wolf RNT defaults to 0-9
    const rollType = test.roll ?? "random_0_9";
    const baseRoll = roll(rollType, random);

    const modifier = calculateModifiers(test.modifiers ?? [], state);
    const result = baseRoll + modifier;

    const outcome = findOutcome(result, test.outcomes);

    return {
        baseRoll,
        modifier,
        result,
        outcome
    };
}

function roll(type, random) {
    switch (type) {
        case "random_0_9":
            return Math.floor(random() * 10);
        case "random_1_10":
            return Math.floor(random() * 10) + 1;
        default:
            throw new Error(`Unknown random roll: ${type}`);
    }
}

function calculateModifiers(modifiers, state) {
    let total = 0;

    for (const modifier of modifiers) {
        // Matches "require" property from sections.json
        const req = modifier.require ?? modifier.if;
        if (!req || meetsRequirement(req, state)) {
            total += modifier.add ?? 0;
        }
    }

    return total;
}

function findOutcome(result, outcomes) {
    for (const outcome of outcomes) {
        if (
            (outcome.min === undefined || result >= outcome.min) &&
            (outcome.max === undefined || result <= outcome.max)
        ) {
            return outcome;
        }
    }

    throw new Error(`No outcome matches random result ${result}`);
}