export default {
    data() {
        return {
            rowsPerPage: [50, 100, {text: 'All', value: -1}],
            headers: [
                {text: this.$t('components.name'), align: 'left', value: 'name'},
                {text: this.$t('components.status'), align: 'left', value: 'statusStr'},
                {text: this.$t('components.actions'), align: 'left', sortable: false},
                {text: this.$t('logs'), align: 'left', value: 'log'},
                {text: this.$t('components.last_message'), align: 'left', value: 'message'}
            ],
            logDialog: false,
            log: {name: '', data: ''},
            componentsAll: []
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
        }
    },

    methods: {
        async applyStateToComponent(component, state) {
            try {
                component.loading = true;
                let params = {name: component.name, state: state};
                let salt_result = await this.$axios.post('components/stateApply', params);
                component.logs = salt_result.data.logs;
                component.logs_error = salt_result.data.logs_error;
                let {data: comp} = await this.$axios.get(`components/${component.name}`);
                component.status = comp.status;
                component.statusStr = component.status === true ? this.$t('ok') : this.$t('fail');

                if (["install", "uninstall"].includes(state)) {
                    component.installed = !component.installed;
                    component.enabled = !component.enabled;
                }
                else if (["enabled", "disabled"].includes(state)) {
                    component.enabled = !component.enabled;
                }
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                component.loading = false;
            }
        },
        async recheckComponentStatus(component) {
            try {
                component.loading = true;
                let params = {component_name: component.name};
                console.log( component );
                let run_check = await this.$axios.post('components/checkComponent', params);
                console.log( run_check );
                let {data: comp} = await this.$axios.get(`components/${component.name}`);
                component.status = comp.status;
                component.statusStr = component.status === true ? this.$t('ok') : this.$t('fail');
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                component.loading = false;
            }
        }
    },

    async asyncData({store, error, app: {$axios, i18n}}) {
        try {
            let {data: componentsAll} = await $axios.get('components');

            for (let component of componentsAll) {
                component.statusStr = component.status === true ? i18n.t('ok') : i18n.t('fail');
                // component.loading = false;
                component.logs = false;
                component.logs_error = false;
            }

            return {componentsAll};
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}