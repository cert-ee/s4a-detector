export default {
    data() {
        return {
            rowsPerPage: [50, 100, {text: 'All', value: -1}],
            headers: [
                {text: this.$t('components.name'), align: 'left', value: 'name'},
                {text: this.$t('components.status'), align: 'left', value: 'statusStr'},
                {text: this.$t('components.versions'), align: 'left', value: 'version_installed'},
                {text: this.$t('components.actions'), align: 'left', sortable: false},
                {text: this.$t('logs'), align: 'left', value: 'log'},
                {text: this.$t('components.last_message'), align: 'left', value: 'message'}
            ],
            logDialog: false,
            log: {name: '', data: ''}
        }
    },

    computed: {
        search: {
            get() { return this.$store.state.components.search; },
            set(value) { this.$store.commit('components/setSearch', value); }
        },

        pagination: {
            get() { return this.$store.state.components.pagination; },
            set(value) { this.$store.commit('components/setPagination', value); }
        },

        components: {
            get() { return this.$store.state.components.components; },
            set(value) { return this.$store.commit('components/setComponents', value); }
        }
    },

    methods: {
        async applyStateToComponent(component, state) {
            let comp = Object.assign({}, component);

            try {
                comp.loading = true;
                this.$store.commit('components/updateComponent', comp);
                let params = {name: comp.name, state: state};
                let salt_result = await this.$axios.$post('components/stateApply', params);
                comp = await this.$axios.$get(`components/${comp.name}`);
                // comp.logs = salt_result.logs;
                // comp.logs_error = salt_result.logs_error;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                comp.loading = false;
                this.$store.commit('components/updateComponent', comp);
            }
        },
        async recheckComponentStatus(component) {
            let comp = Object.assign({}, component);

            try {
                comp.loading = true;
                this.$store.commit('components/updateComponent', comp);
                let params = {component_name: comp.name};
                await this.$axios.post('components/checkComponent', params);
                comp = await this.$axios.$get(`components/${comp.name}`);
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                comp.loading = false;
                this.$store.commit('components/updateComponent', comp);
            }
        }
    },

    async asyncData({store, error, app: {$axios, i18n}}) {
        try {
            let components = await $axios.$get('components');

            for (let component of components) {
                component.statusStr = component.status === true ? i18n.t('ok') : i18n.t('fail');
                // component.logs = false;
                // component.logs_error = false;
            }

            store.commit('components/setComponents', components);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}