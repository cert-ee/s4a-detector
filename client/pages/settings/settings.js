export default {
    data() {
        return {
            settings: {
                job_interval_alerts_check: 1,
                alerts_severity_all: true,
                alerts_info_level_all: true,
                job_interval_rules_check: 1,
                auto_rules: true,
                job_interval_status_check: 1,
                auto_upgrade: true
            },
            origInterfaces: [],
			interfaces: [],
            alerts_tooltips: {
                all: "Report all alerts registered\n based on Suricata rules",
                critical: "Limit reporting to only Critical\n alerts based on Suricata rules",
                full : "Report details contain Suricata default dataset",
                limited : "Reported alert contents is limited to:\n \"_id\", \"alert\", \"event_type\",\n \"flow_id\", \"in_iface\", \"proto\",\n \"timestamp\""
            },
			interface_headers: [
				{ text: this.$t('settings.name'), align: 'left', value: 'name' },
				{ text: this.$t('settings.state'), align: 'left', value: 'state' },
				{ text: this.$t('settings.ip'), align: 'left', value: 'ip' },
				{ text: this.$t('settings.listening'), align: 'center', sortable: false }
			],
            interface_loading: false,
            nfsen: {},
            nfsenSamplingRate: -1000,
            nfsen_loading: false,
            nginx: {},
            nginx_loading: false,
            nginxConfDialog: false
        }
    },

    computed: {
        drawer: {
            get() { return this.$store.state.drawer; },
            set() {}
        },

        interfacesChanged() {
            if (!this.interfaces.some(i => i.enabled)) return false;

            for (const iface of this.interfaces) {
                if (this.origInterfaces.find(i => i.name === iface.name).enabled !== iface.enabled) return true;
            }

            return false;
        },

        samplingRateChanged() {
            return this.nfsen.configuration && this.nfsen.configuration.sampling_rate != this.nfsenSamplingRate;
        }
    },

    methods: {
        async updateSetting(name) {
            try {
                await this.$axios.post('settings/updateSetting', {name, value: this.settings[name]});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },

        async applyInterfaceChanges() {
            if (!this.interfaces.some(i => i.enabled)) return;
            this.interface_loading = true;
            let interfaces = [];

            for (const iface of this.interfaces) {
                if (this.origInterfaces.find(i => i.name === iface.name).enabled !== iface.enabled) {
                    interfaces.push({name: iface.name, enabled: iface.enabled});
                }
            }

            try {
                await this.$axios.post('network_interfaces/applyChanges', {interfaces});
                this.origInterfaces = this.interfaces.map(i => ({...i}));
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.interface_loading = false;
            }
        },

        async applyNfsenChanges() {
            this.nfsen_loading = true;

            try {
                await this.$axios.patch('components/nfsen', {configuration: {sampling_rate: this.nfsenSamplingRate}});
                await this.$axios.post('components/stateApply', {name: 'nfsen', state: 'restart'});
                this.nfsen.configuration.sampling_rate = this.nfsenSamplingRate;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.nfsen_loading = false;
            }
        },

        async applyNginxChanges() {
            this.nginx_loading = true;

            try {
                await this.$axios.post('components/sslCheck', this.nginx.configuration );
                await this.$axios.patch('components/nginx', { configuration: this.nginx.configuration });
                await this.$axios.post('components/stateApply', {name: 'nginx', state: 'restart'});
                this.nginx.configuration.ssl_enabled = true;
                this.nginxConfDialog = false;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.nginx_loading = false;
            }
        },

        async disableSSL() {
            this.nginx_loading = true;

            try {
                await this.$axios.post('components/sslDisable');
                this.nginx.configuration.ssl_cert = '';
                this.nginx.configuration.ssl_chain = '';
                this.nginx.configuration.ssl_key = '';
                this.nginx.configuration.ssl_enabled = false;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.nginx_loading = false;
            }
        }
    },

    async asyncData({ store, app: {$axios} }) {
        try {
            let [ {data: settings}, {data: interfaces}, {data: nfsen}, {data: nginx} ] = await Promise.all([
                $axios.get('settings/settingid'), $axios.get('network_interfaces/list'),
                $axios.get('components/nfsen'), $axios.get('components/nginx')
            ]);

            const nfsenSamplingRate = nfsen.configuration && nfsen.configuration.sampling_rate;
            return { settings, interfaces, origInterfaces: interfaces.map(i => ({...i})), nfsen, nfsenSamplingRate, nginx };
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}