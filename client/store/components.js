import Vue from 'vue';

export function state() {
    return {
        search: '',
        pagination: {
            descending: false,
            page: 1,
            rowsPerPage: 50,
            sortBy: ''
        },
        components: []
    };
}

export const mutations = {
    setSearch(state, value) {
        state.search = value;
    },

    setPagination(state, value) {
        state.pagination = value;
    },

    setComponents(state, components) {
        state.components = components;
    },

    updateComponent(state, component) {
        const i = state.components.findIndex(c => c.name === component.name);
        const i18n = this.app.i18n;
        component.statusStr = component.status === true ? i18n.t('ok') : i18n.t('fail');
        Vue.set(state.components, i, component);
    }
};