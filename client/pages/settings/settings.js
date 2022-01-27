export default {
    data() {
        return {
            rowsPerPage: [50, 100, {text: 'All', value: -1}],
            settings: {
                job_interval_alerts_check: 1,
                alerts_severity_all: true,
                alerts_info_level_all: true,
                job_interval_rules_check: 1,
                auto_rules: true,
                job_interval_status_check: 1,
                auto_upgrade: true,
                smtp_server_requires_auth: false,
                smtp_server_host: 'hostname',
                smtp_server_port: 465,
                smtp_server_tls: true,
                smtp_server_auth_method: 'PLAIN',
                smtp_server_force_notls: false,
                smtp_server_username: 's4a',
                smtp_server_password: 's4a',
                smtp_server_from: 's4a@localhost'
            },
            smtpAuthMethods: ['PLAIN', 'LOGIN', 'CRAM-MD5'],
            origInterfaces: [],
            interfaces: [],
            alerts_tooltips: {
                all: "Report all alerts registered\n based on Suricata rules",
                critical: "Limit reporting to only Critical\n alerts based on Suricata rules",
                full: "Report details contain Suricata default dataset",
                limited: "Reported alert contents is limited to:\n \"_id\", \"alert\", \"event_type\",\n \"flow_id\", \"in_iface\", \"proto\",\n \"timestamp\""
            },
            interface_headers: [
                {text: this.$t('settings.name'), align: 'left', value: 'name'},
                {text: this.$t('settings.state'), align: 'left', value: 'state'},
                {text: this.$t('settings.ip'), align: 'left', value: 'ip'},
                {text: this.$t('settings.listening'), align: 'center', sortable: false}
            ],
            interface_loading: false,
            nginx: {},
            nginx_loading: false,
            nginxConfDialog: false,
            passwordVisible: false,
            moloch: {},
            salt_loading: false,
            arrayEditorDialog: {
                open: false,
                title: "",
                parameter_name: "",
                list: []
            },
        }
    },

    computed: {
        interfacesChanged() {
            if (!this.interfaces.some(i => i.enabled)) return false;

            for (const iface of this.interfaces) {
                if (this.origInterfaces.find(i => i.name === iface.name).enabled !== iface.enabled) return true;
            }

            return false;
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


        openArrayEditor(parameter_name) {
            // console.log("open array editor");
            // console.log(parameter_name);
            // console.log( this.moloch.configuration.exclude_ips );

            this.arrayEditorDialog.list = this.moloch.configuration.exclude_ips;
            this.arrayEditorDialog.title = parameter_name;
            this.arrayEditorDialog.parameter_name = "exclude_ips";
            this.arrayEditorDialog.open = true;

        },

        async arrayEditorSave() {
            try {
                // console.log("save array editor ")
                // console.log( this.arrayEditorDialog.list );

                //TODO filter ips?

                this.arrayEditorDialog.list = this.arrayEditorDialog.list.filter(function (value, index, arr) {
                    return value !== '' && value !== undefined && value !== null && /\S/.test(value);
                });

                console.log("list");
                console.log(this.arrayEditorDialog.list);

                this.moloch.configuration.exclude_ips = this.arrayEditorDialog.list;

                this.arrayEditorDialog.open = false;
                this.arrayEditorDialog = {
                    open: false,
                    title: "",
                    parameter_name: "",
                    list: []
                };

                await this.applyMolochChanges();

                this.$store.commit('showSnackbar', {type: 'success', text: this.$t('saved')});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }

        },

        async applyMolochChanges() {
            this.salt_loading = true;

            let moloch_configuration = {
                configuration: {
                    yara_enabled: this.moloch.configuration.yara_enabled,
                    wise_enabled: this.moloch.configuration.wise_enabled,
                    exclude_ips: this.moloch.configuration.exclude_ips,
                    drop_tls: this.moloch.configuration.drop_tls
                }
            };

            try {
                await this.$axios.patch('components/moloch', moloch_configuration);
                await this.$axios.post('components/stateApply', {name: 'moloch', state: 'restart'});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.salt_loading = false;
            }
        },

        async applyNginxChanges() {
            this.nginx_loading = true;

            try {
                this.nginx.configuration.ssl_enabled = true;
                await this.$axios.post('components/sslCheck', this.nginx.configuration);
                await this.$axios.patch('components/nginx', {configuration: this.nginx.configuration});
                // await this.$axios.post('components/stateApply', {name: 'nginx', state: 'restart'});
                // this.nginx.configuration.ssl_enabled = true;
                this.nginxConfDialog = false;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.nginx_loading = false;
            }

            try {
                await this.$axios.post('components/stateApply', {name: 'nginx', state: 'restart'});
            } catch (err) {
                // this.$store.dispatch('handleError', err);
            } finally {
                this.nginxConfDialog = false;
                this.nginx_loading = false;
            }

        },

        async disableSSL() {
            this.nginx_loading = true;

            try {
                this.nginx.configuration.ssl_cert = '';
                this.nginx.configuration.ssl_chain = '';
                this.nginx.configuration.ssl_key = '';
                this.nginx.configuration.ssl_enabled = false;
                await this.$axios.post('components/sslDisable');
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.nginx_loading = false;
            }
        },

        async resetSmtpPortValue() {

            try {
                if (this.settings['smtp_server_tls']) {
                    if (this.settings['smtp_server_port'] != 465) {
                        this.settings['smtp_server_port'] = 465;
                        await this.updateSetting('smtp_server_port');
                    }

                    if (this.settings['smtp_server_force_notls']) {
                        this.settings['smtp_server_force_notls'] = false;
                        await this.updateSetting('smtp_server_force_notls');
                    }
                } else {
                    if (this.settings['smtp_server_port'] != 587) {
                        this.settings['smtp_server_port'] = 587;
                        await this.updateSetting('smtp_server_port');
                    }
                }
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },

        async resetSmtpPortValueAndUpdateTLS() {

            try {
                if (this.settings['smtp_server_force_notls']) {
                    if (this.settings['smtp_server_port'] != 587) {
                        this.settings['smtp_server_port'] = 587;
                        await this.updateSetting('smtp_server_port');
                    }
                    if (this.settings['smtp_server_tls']) {
                        this.settings['smtp_server_tls'] = false;
                        await this.updateSetting('smtp_server_tls');
                    }
                }
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },

        async updateRules() {
            try {
                // console.log( "UPDATE RULES");
                this.$store.commit('setRulesSyncing', true);
                let yara_result = await this.$axios.get('yara/checkRoutine');
                console.log("yara_result");
                console.log(yara_result);
                let wise_result = await this.$axios.get('wise/checkRoutine');
                console.log("wise_result");
                console.log(wise_result);
                let rules_result = await this.$axios.get('rules/checkRoutine', {
                    params: {
                        params: {full_check: true}
                    }
                });
                console.log("rules_result");
                console.log(rules_result);

                this.rulesStatus = true;
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                setTimeout(() => {
                    this.$store.commit('setRulesSyncing', false);
                }, 1000);
            }
        }

    },

    async asyncData({store, app: {$axios}}) {
        try {
            let [{data: settings}, {data: interfaces}, {data: nginx}, {data: moloch}] = await Promise.all([
                $axios.get('settings/settingid'), $axios.get('network_interfaces/list'),
                $axios.get('components/nginx'), $axios.get('components/moloch')
            ]);

            return {
                settings,
                interfaces,
                origInterfaces: interfaces.map(i => ({...i})),
                nginx,
                moloch
            };
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}
