export default {
    data() {
        return {
            resetDemoDialog: false,
            sendFeedbackDialog: false,
            feedback: {
                message: '',
                comment: '',
                logs: {data: ''}
            },
            formValid: false,
            rules: {
                required: (value) => !!value || this.$t("required")
            },
            feedbackLoading: false
        }
    },

    computed: {
        drawer: {
            get() {
                return this.$store.state.drawer;
            },
            set(value) {
                this.$store.commit('toggleDrawer', value);
            }
        },

        snackBar: {
            get() {
                return this.$store.state.snackBar.open;
            },
            set() {
                this.$store.commit('closeSnackbar');
            }
        },

        rulesExpanded: {
            get() {
                return this.$store.state.rulesExpanded;
            },
            set(value) {
                this.$store.commit('setRulesExpanded', value)
            }
        }
    },

    methods: {
        hasAdminRole() {
            return this.$store.state.user && this.$store.state.user.roles.some(r => r.name === 'admin');
        },

        async sendFeedback() {
            try {
                this.$refs.sendFeedbackForm.validate();
                if (!this.formValid) return;
                this.feedbackLoading = true;

                const [
                    {data: contacts}, {data: components},
                    {data: network_interfaces}, {data: system_info}
                ] = await Promise.all([
                    this.$axios.get('registration/registrationid'), this.$axios.get('components'),
                    this.$axios.get('network_interfaces/list'), this.$axios.get('system_info/list')
                ]);

                const data = {...this.feedback, contacts, components, network_interfaces, system_info};
                const result = await this.$axios.post('report/feedback', data);
                if (result.status !== 200) throw new Error('Sending feedback failed');
                this.sendFeedbackDialog = false;
                this.$store.commit('showSnackbar', {type: 'success', text: 'Feedback sent successfully.'});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                this.feedbackLoading = false;
            }
        },

        clearFeedbackForm() {
            this.feedback.message = '';
            this.feedback.comment = '';
            this.feedback.logs.data = '';
        },
        showResetDemoConfirm() {
            this.resetDemoDialog = true;
        },
        async resetDemo() {
            console.log("resetDemo");
            this.resetDemoDialog = false;

            const result = await this.$axios.get('/settings/resetApp');
            console.log(result);

            this.$store.commit('changeRegStatus', {setupDone: false});
            this.$router.push('/setup');

        }
    }
}