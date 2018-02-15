export default {
    layout: 'setup',

    data() {
        return {
            currentStep: 1,
            steps: [
                {name: this.$t("setup.step_welcome"), complete: false},
                {name: this.$t("setup.step_registration"), complete: false},
                {name: this.$t("setup.step_sys"), complete: false},
                {name: this.$t("setup.step_components"), complete: false},
                {name: this.$t("setup.step_summary"), complete: false},
                {name: this.$t("setup.step_install"), complete: false}
            ],
            formValid: false,
            registration: {
                first_name: '',
                last_name: '',
                organization_name: '',
                contact_email: '',
                contact_phone: ''
                //for testing
                // first_name: 'test_' + Math.floor(new Date()),
                // last_name: 'test_' + Math.floor(new Date()),
                // organization_name: 'test_' + Math.floor(new Date()),
                // contact_email: 'test_' + Math.floor(new Date()) + '@test.ee',
                // contact_phone: 'test_' + Math.floor(new Date())
            },
            rules: {
                required: (value) => !!value || this.$t("setup.required_field"),
                email: (value) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(value) || this.$t("setup.valid_email")
            },
            interface_pagination: {
                descending: false,
                page: 1,
                rowsPerPage: 50,
                sortBy: ''
            },
            interface_headers: [
                {text: this.$t("setup.net_name"), align: 'left', value: 'name'},
                {text: this.$t("setup.net_state"), align: 'left', value: 'state'},
                {text: this.$t("setup.net_ip"), align: 'left', value: 'ip'},
                {text: this.$t("setup.net_install"), align: 'center', sortable: false}
            ],
            disks_headers: [
                {text: this.$t("setup.disk_mount"), align: 'left', value: 'mount'},
                {text: this.$t("setup.disk_part"), align: 'left', value: 'part'},
                {text: this.$t("setup.disk_type"), align: 'left', value: 'type'},
                {text: this.$t("setup.disk_size"), align: 'left', value: 'size'},
                {text: this.$t("setup.disk_free"), align: 'left', value: 'free'},
            ],
            system_info: {},
            interfaces: [],
            feedback_button: false,
            feedback_comment: "",
            feedback_result: false,
            registration_button: false,
            finish_button: false,
            component_pagination: {
                descending: false,
                page: 1,
                rowsPerPage: 50,
                sortBy: ''
            },
            components: [],
            components_all: [],
            component_headers: [
                {text: this.$t("setup.item_header_name"), align: 'left', value: 'friendly_name'},
                {text: this.$t("setup.item_header_comment"), align: 'left', value: 'friendly_name'},
                {text: this.$t("setup.item_header_install"), align: 'center', sortable: false}
            ],
            install_pagination: {
                descending: false,
                page: 1,
                rowsPerPage: 50,
                sortBy: ''
            },
            install_headers: [
                {text: this.$t("setup.item_header_name"), align: 'left', value: 'friendly_name'},
                {text: this.$t("setup.item_header_status"), align: 'left', sortable: false}
            ],
            logDialog: false,
            log: {name: '', data: ''},
            errorSnack: false,
            errorText: ''
        }
    },

    filters: {
        kbytesToSize(kbytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (kbytes === 0) return 'n/a';
            kbytes *= 1024;
            const i = parseInt(Math.floor(Math.log(kbytes) / Math.log(1024)), 10);
            if (i === 0) return `${kbytes} ${sizes[i]})`;
            return `${(kbytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
        }
    },

    methods: {
        async sendFeedback() {
            try {
                console.log( "send feedback" );

                let edit_reginfo = this.registration;
                    delete edit_reginfo.components;
                    delete edit_reginfo.interfaces;
                    delete edit_reginfo.system_info;

                let data = {
                    message: "Setup failed",
                    comment : this.feedback_comment,
                    contacts : edit_reginfo,
                    components : this.components_all, //logs are per component here
                    network_interfaces: this.interfaces,
                    system_info: this.system_info,
                };

                const result = await this.$axios.post('/report/feedback', data);
                if (result.status !== 200 ) throw new Error('Feedback post failed');
                console.log( "central response" );
                console.log( result.data );

                if( result.data ){
                    this.feedback_button = false;
                    this.feedback_result = result.data.central_response;
                }

            } catch (err) {
                console.log(err);
                if (err.response && err.response.data.error && err.response.data.error.message) {
                    this.errorText = err.response.data.error.message;
                } else {
                    this.errorText = 'Error. Local or Central API is down. Try again later.';
                }
                this.errorSnack = true;
            }
        },


        /**
         * INSTALL COMPONENTS
         *
         * loop all components and install per parameters
         * if debug/dev is active, no install will take place
         *
         * @param debug
         * @returns {Promise<boolean>}
         */
        async installComponents(debug) {
            try {
                console.log("installComponents");

                let current, comp_input, component_result;
                for (let i = 0, l = this.components_all.length; i < l; i++) {
                    current = this.components_all[i];
                    console.log("looping salt " + i + " | " + current.name);

                    if (current.after_approval == true) { //will be installed at a later stage
                        console.log( current.name, "will be installed after approval");
                        continue;
                    }

                    if (current.going_to_install == false) { //component not selected
                        console.log( current.name, "not selected, not going to install" );
                        continue;
                    }

                    if (current.installed == true) { //already installed
                        console.log( current.name, "is already installed" );
                        continue;
                    }

                    this.components_all[i].loading = true;
                    comp_input = {name: current.name, state: "install", debug: false};

                    if (debug) {
                        console.log( current.name, "debug mode: fake salt calls");
                        comp_input.debug = true;
                    }

                    component_result = await this.$axios.post('/components/stateApply', comp_input);
                    console.log("component salt result: ");
                    console.log(component_result);
                    //console.log("component salt result.data: ");
                    //console.log( component_result.data );

                    this.components_all[i].salt_done = true;
                    this.components_all[i].loading = false;

                    if (!component_result) {
                        console.log( current.name, "component install failed");
                        this.feedback_button = true;
                        this.components_all[i].installed = false;
                    } else {
                        this.components_all[i].installed = true;
                    }

                    if (component_result.data === undefined ||
                        component_result.data.logs === undefined ||
                        component_result.data.logs_error === undefined
                    ) continue;

                    if (component_result.data.logs.length > 2) this.components_all[i].logs = component_result.data.logs;
                    if (component_result.data.logs_error.length > 2) this.components_all[i].logs_error = component_result.data.logs_error;

                    console.log( current.name, "component install result");
                    console.log( current.name, component.result);

                } // components for loop

                return true;

            } catch (err) {
                console.log(err);
                if (err.response && err.response.data.error && err.response.data.error.message) {
                    this.errorText = err.response.data.error.message;
                } else {
                    this.errorText = 'Error. Local or Central API is down. Try again later.';
                }
                this.errorSnack = true;
            }
        },

        async postRegistration() {
            try {
                console.log("try to post registration data to central");

                let data = this.registration;
                    data.components = this.components_all;
                    data.interfaces = this.interfaces;
                    data.system_info = this.system_info;

                const result = await this.$axios.post('/registration/initiate', data);

                this.$store.commit('changeRegStatus', {
                    setupDone: true,
                    regStatus: 'Started',
                    regUser: this.registration.organization_name
                });

                this.registration_button = false;
                this.finish_button = true;

            } catch (err) {
                console.log(err);
                this.registration_button = true;
                if (err.response && err.response.data.error && err.response.data.error.message) {
                    this.errorText = err.response.data.error.message;
                } else {
                    this.errorText = 'Sending registration information to central failed';
                }
                this.errorSnack = true;
            }
        },

        /**
         * INSTALLER
         *
         * debug mode will not make any actual salt calls
         *
         * @param debug
         * @returns {Promise<void>}
         */
        async runSetup(debug) {
            try {

                if( debug ){
                    console.warn("run debug, register only");
                } else {
                    console.log("run setup with component installations and register");
                }

                let update_input, update_result, has_interfaces = false;
                for (const inter of this.interfaces) {
                    console.log(inter);
                    if (inter.install) {
                        update_input = {enabled: inter.install};
                        update_result = await this.$axios.patch('network_interfaces/' + inter.name, update_input);
                        has_interfaces = true;
                    }
                }

                if (!has_interfaces) {
                    console.log("network failure, no interfaces detected");
                    this.currentStep = 3;
                    throw new Error("No network interfaces found");
                }

                this.currentStep++;
                this.steps[4].complete = true;

                console.log("go to components installation");
                let comp_result = await this.installComponents(debug);
                console.log("components install result: ");
                console.log(comp_result);

                if (!comp_result) {
                    this.feedback_button = true;
                    return;
                }

                this.postRegistration();

            } catch (err) {
                console.log(err);
                if (err.response && err.response.data.error && err.response.data.error.message) {
                    this.errorText = err.response.data.error.message;
                } else if ( err.message ) {
                    this.errorText = err.message;
                } else {
                    this.errorText = 'Components installation failed';
                }
                this.errorSnack = true;
            }
        }
    },

    async asyncData({store, error, app: {$axios}}) {
        try {

            let {data: interfaces} = await $axios.get('network_interfaces/list');
            let {data: system_info} = await $axios.get('system_info/list');
            // console.log(interfaces);
            // console.log(system_info);

            for (let i = 0, l = interfaces.length; i < l; i++) {
                interfaces[i].install = true;
                if( interfaces[i].ip != "" ){ //if interface has IP, do not enable
                    interfaces[i].install = false;
                }
            }

            let {data: components_all} = await $axios.get('components');
            if (!components_all || !components_all.length) return {components_all: []};

            for (let i = 0, l = components_all.length; i < l; i++) {
                components_all[i].going_to_install = components_all[i].preset;
                if( components_all[i].installed ) {
                    components_all[i].going_to_install = true;
                }
                components_all[i].salt_done = false;
                components_all[i].loading = false;
                components_all[i].logs = false;
                components_all[i].logs_error = false;
            }
            //console.log( components_all );
            return {interfaces, system_info, components_all};
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error(err.message);
            }
        }
    }
}