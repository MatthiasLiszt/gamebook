
export function meetsRequirement(requirement, state) {
    if (!requirement) {
        return true;
    }

    const req = requirement.require ?? requirement;

    // Single item check
    if (req.item) {
        return state.backpack?.includes(req.item)
            || state.specialItems?.includes(req.item)
            || state.weapons?.includes(req.item);
    }

    // Any item check (Section 31)
    if (req.any_item) {
        return req.any_item.some(item =>
            state.backpack?.includes(item) ||
            state.specialItems?.includes(item) ||
            state.weapons?.includes(item)
        );
    }

    // Discipline check
    if (req.discipline) {
        return state.disciplines?.includes(req.discipline);
    }

    // Rank check
    if (req.rank_at_least) {
        return rankIsAtLeast(state.rank, req.rank_at_least);
    }

    // Flag check (Section 23)
    if (req.flag) {
        return state.flags?.[req.flag] === true;
    }

    // Backpack count check (Section 19)
    if (req.backpack_count !== undefined) {
        return (state.backpack?.length ?? 0) >= req.backpack_count;
    }

    // Logical wrappers
    if (req.all) {
        return req.all.every(r => meetsRequirement(r, state));
    }
    if (req.any) {
        return req.any.some(r => meetsRequirement(r, state));
    }
    if (req.not) {
        return !meetsRequirement(req.not, state);
    }

    throw new Error(`Unknown requirement: ${JSON.stringify(req)}`);
}

const RANKS = [
    "novice", "intuite", "doan", "acolyte", "initiate",
    "aspirant", "guardian", "warmarn", "savant", "master"
];

function rankIsAtLeast(currentRank, requiredRank) {
    const currentIndex = RANKS.indexOf(currentRank?.toLowerCase());
    const requiredIndex = RANKS.indexOf(requiredRank?.toLowerCase());

    if (currentIndex === -1 || requiredIndex === -1) {
        return false;
    }

    return currentIndex >= requiredIndex;
}