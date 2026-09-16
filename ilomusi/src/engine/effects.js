
export function applyEffects(effects, state, itemDefinitions = {}) {
    if (!effects) return;

    for (const effect of effects) {
        applyEffect(effect, state, itemDefinitions);
    }
}

function applyEffect(effect, state, itemDefinitions) {
    if (effect.stat) {
        changeStat(state, effect.stat, effect.change ?? 0);
        return;
    }

    if (effect.gold !== undefined) {
        if (effect.gold === "lose_all") {
            state.gold = 0;
        } else {
            state.gold = Math.max(0, state.gold + effect.gold);
        }
        return;
    }

    if (effect.add_item) {
        addItem(state, effect.add_item, itemDefinitions);
        return;
    }

    if (effect.remove_item) {
        removeItem(state, effect.remove_item);
        return;
    }

    if (effect.remove_backpack_items) {
        state.backpack.splice(0, effect.remove_backpack_items);
        return;
    }

    if (effect.confiscate_all) {
        state.storedEquipment = {
            weapons: [...state.weapons],
            backpack: [...state.backpack],
            specialItems: [...state.specialItems],
            gold: state.gold
        };
        state.weapons = [];
        state.backpack = [];
        state.specialItems = [];
        state.gold = 0;
        return;
    }

    if (effect.restore_confiscated) {
        if (state.storedEquipment) {
            state.weapons = [...state.storedEquipment.weapons];
            state.backpack = [...state.storedEquipment.backpack];
            state.specialItems = [...state.storedEquipment.specialItems];
            state.gold = state.storedEquipment.gold;
            state.storedEquipment = null;
        }
        return;
    }

    if (effect.restore_combat_skill) {
        state.combatSkill = state.maxCombatSkill ?? state.combatSkill;
        return;
    }

    if (effect.flag) {
        state.flags ??= {};
        state.flags[effect.flag.name] = effect.flag.value;
        return;
    }

    throw new Error(`Unknown effect: ${JSON.stringify(effect)}`);
}

function changeStat(state, stat, change) {
    if (typeof state[stat] !== "number") {
        throw new Error(`Unknown or non-numeric stat: ${stat}`);
    }

    state[stat] += change;

    if (stat === "endurance" && state.maxEndurance !== undefined) {
        state.endurance = Math.min(state.endurance, state.maxEndurance);
    }
}

function addItem(state, item, itemDefinitions) {
    const category = itemDefinitions[item]?.category ?? "backpack";

    if (category === "weapon") {
        state.weapons ??= [];
        if (state.weapons.length < 2) state.weapons.push(item);
    } else if (category === "special") {
        state.specialItems ??= [];
        state.specialItems.push(item);
    } else {
        state.backpack ??= [];
        if (state.backpack.length < 8) state.backpack.push(item);
    }
}

function removeItem(state, item) {
    const collections = [state.backpack, state.specialItems, state.weapons];

    for (const collection of collections) {
        if (!collection) continue;
        const index = collection.indexOf(item);
        if (index !== -1) {
            collection.splice(index, 1);
            return;
        }
    }
}