import DashboardCard from '~/components/DashboardCard';

export default {
    components: {
        DashboardCard
    },

    data() {
        return {
            centralStatus: false,
            centralToken: null,
            lastSync: null,
            lastRulesUpdate: null,
            lastAlertsUpdate: null,
            alertsSentTotal: null,
            alertsSentToday: null,
            rulesStatus: false,
            rulesAvailable: 0,
            syncing: false,
            refreshing: false,
            components: [],
            installableComponents: 0,
            installedComponents: 0,
            componentProblems: 0,
            componentUpdatesAvailable: 0,
            rule_drafts: {},
            centralTokenVisible: false
        }
    },

    mounted() {
        this.syncInterval = setInterval(() => {
            this.refreshDashboard();
        }, 5000);
    },

    beforeDestroy() {
        clearInterval(this.syncInterval);
    },

    methods: {
        async refreshDashboard() {
            this.refreshing = true;

            let [
                {data: reg}, {data: central}, {data: components},
                {data: rule_drafts}, {data: report}
            ] = await Promise.all([
                this.$axios.get('registration/registrationid'), this.$axios.get('central'),
                this.$axios.get('components'), this.$axios.get('rule_drafts/count'), this.$axios.get('report')
            ]);

            const registration = {
                setupDone: true,
                regStatus: reg.registration_status,
                regUser: reg.organization_name,
                regRejectedReason: reg.reject_reason,
                uniqueName: reg.unique_name,
                temporaryName: reg.temporary_name
            };

            this.$store.commit('changeRegStatus', registration);

            central = central && central.length && central[0];
            report = report && report.length && report[0];
            this.centralToken = central.central_token;
            this.centralStatus = central.central_status;
            this.lastSync = central.last_central_check;
            this.lastRulesUpdate = central.last_rules_update;
            this.rulesStatus = central.rules_status;
            this.rulesAvailable = central.rules_new_available;
            this.lastAlertsUpdate = central.last_alerts_update;
            this.alertsSentToday = report.alerts_sent_today;
            this.alertsSentTotal = report.alerts_sent_total;
            let installableComponents = components.filter(c => c.installable === true);
            let installedComponents = installableComponents.filter(c => c.installed === true);
            this.componentProblems = installedComponents.filter(c => c.status === false).length;
            this.componentUpdatesAvailable = components.filter(c => c.version_status === false && c.installed === true).length;

            this.installedComponents = installedComponents.length;
            this.installableComponents = installableComponents.length;
            this.rule_drafts = rule_drafts;

            setTimeout(() => {
                this.refreshing = false;
            }, 1000);
        },

        async syncWithCentral() {
            this.syncing = true;

            try {
                await this.$axios.get('report/statusRoutine');
                this.lastSync = this.$moment();
            } catch (err) {
                this.$store.dispatch('handleError', err);
            } finally {
                setTimeout(() => {
                    this.syncing = false;
                }, 1000);
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
                let rules_result = await this.$axios.get('rules/checkRoutine');
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

    async asyncData({store, error, app: {$axios}}) {
        try {
            let [
                {data: reg}, {data: central}, {data: components},
                {data: rule_drafts}, {data: report}
            ] = await Promise.all([
                $axios.get('registration/registrationid'), $axios.get('central'),
                $axios.get('components'), $axios.get('rule_drafts/count'), $axios.get('report')
            ]);

            const registration = {
                setupDone: true,
                regStatus: reg.registration_status,
                regUser: reg.organization_name,
                regRejectedReason: reg.reject_reason,
                uniqueName: reg.unique_name,
                temporaryName: reg.temporary_name
            };

            store.commit('changeRegStatus', registration);

            central = central && central.length && central[0];
            report = report && report.length && report[0];
            let installableComponents = components.filter(c => c.installable === true);
            let installedComponents = installableComponents.filter(c => c.installed === true);
            let componentProblems = installedComponents.filter(c => c.status === false).length;
            let componentUpdatesAvailable = components.filter(c => c.version_status === false && c.installed === true).length;
            installedComponents = installedComponents.length;
            installableComponents = installableComponents.length;

            return {
                centralToken: central.central_token,
                centralStatus: central.central_status, lastSync: central.last_central_check,
                lastRulesUpdate: central.last_rules_update, rulesStatus: central.rules_status,
                rulesAvailable: central.rules_new_available, rule_drafts,
                components, installableComponents, installedComponents,
                componentProblems, componentUpdatesAvailable,
                lastAlertsUpdate: central.last_alerts_update,
                alertsSentToday: report.alerts_sent_today,
                alertsSentTotal: report.alerts_sent_total
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