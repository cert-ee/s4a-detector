export function state() {
    return {
        rulesSyncing: false
    };
}

export const mutations = {
    setRulesSyncing(state, value) {
        state.rulesSyncing = value;
    }
};