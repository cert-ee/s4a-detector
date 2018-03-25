export function state() {
    return {
        debugMode: false,
        drawer: true,
        user: {},
        rulesReview: false,
        rulesExpanded: false,
        unauthorized: 'You are not authorized to view this page.',
        versions: {},
        snackBar: {
            type: 'error',
            text: '',
            open: false
        },
        locale: 'en',
        rulesSyncing: false
    };
}

export const mutations = {
    toggleDrawer(state, value) {
        state.drawer = value === undefined ? !state.drawer : value;
    },

    setRulesReview(state, value) {
        state.rulesReview = value;
    },

    setRulesExpanded(state, value) {
        state.rulesExpanded = value;
    },

    changeRegStatus(state, status) {
        state.setupDone = status.setupDone;
        state.regStatus = status.regStatus;
        state.regUser = status.regUser;
        state.regRejectedReason = status.regRejectedReason;
        state.uniqueName = status.uniqueName;
        state.temporaryName = status.temporaryName;
    },

    showSnackbar(state, snackBar) {
        Object.assign(state.snackBar, snackBar);
        state.snackBar.open = true;
    },

    closeSnackbar(state) {
        state.snackBar.open = false;
    },

    setLocale(state, locale) {
        state.locale = locale;
        this.app.i18n.locale = locale;
    },

    setRulesSyncing(state, value) {
        state.rulesSyncing = value;
    }
};

export const actions = {
    async nuxtServerInit({state}, {req, env, error, isDev, app: {$axios}}) {
        try {
            console.log("FRONTEND: NUXT SERVER INIT");
            //console.log(req.headers);
            if (!req.headers["x-remote-user"]) {
                console.log("no x-remote-user");
                error("no x-remote-user");
            }

            //get the header and save for store
            this.$axios.setHeader("x-remote-user", req.headers["x-remote-user"]);
            const params = {filter: {include: 'roles'}};
            const {data: user} = await $axios.get('users/current', {params});
            state.user = user;
            state.rule_custom_name = "custom";
            state.rule_sid_limit = 100000000;
            state.rule_sid_limit_max = 200000000;
            state.API_URL = env.API_URL;
            state.debugMode = isDev;
            console.log( "FRONTEND: API URL:", state.API_URL );

            const [ {data: reg}, {data: versions} ] = await Promise.all([
                $axios.get('registration'), $axios.get('system_info/version')
            ]);

            state.versions = versions;
            state.setupDone = reg && reg.length && reg[0].registration_status !== 'Failed';
            state.regStatus = state.setupDone && reg[0].registration_status;
            state.regUser = state.setupDone && reg[0].organization_name;
            state.regRejectedReason = state.setupDone && reg[0].reject_reason;
            state.uniqueName = reg && reg.length && reg[0].unique_name;
            state.temporaryName = reg && reg.length && reg[0].temporary_name;

            if (state.setupDone) {
                const {data: rule_drafts} = await $axios.get('rule_drafts/count');
                state.rulesReview = rule_drafts && rule_drafts.count;
            }

        } catch (err) {
            console.log(err);
            if (err.response && err.response.data && err.response.data.error) {
                console.log("FRONTEND: errors: " + err.statusCode + " " + err.response.data.error.message + " ");
            }

            error({
                statusCode: err.statusCode,
                message: err.response && err.response.data.error.message || 'Error. Local API is down. Try again later.'
            });
        }
    },

    handleError({commit}, err) {
        commit('showSnackbar', {
            type: 'error',
            text: err.response && err.response.data.error && err.response.data.error.message || err.message
        });
    }
};