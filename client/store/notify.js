import Vue from 'vue';

export function state() {
    return {
        search: '',
        pagination: {
            descending: false,
            page: 1,
            rowsPerPage: 50,
            sortBy: 'name'
        },
        entries: []
    };
}

export const mutations = {
    setSearch(state, value) {
        state.search = value;
    },

    setPagination(state, value) {
        state.pagination = value;
    },

    addEntry(state, entry) {
        state.entries.push(entry);
    },

    setEntries(state, entries) {
        state.entries = entries;
    },

    updateEntry(state, entry) {
        const i = state.entries.findIndex(t => t.id === entry.id);
        Vue.set(state.entries, i, entry);
    },

    deleteEntry(state, entry) {
        const i = state.entries.findIndex(t => t.id === entry.id);
        Vue.delete(state.entries, i);
    }
};