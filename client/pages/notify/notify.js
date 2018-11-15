export default {
    data() {
        return {
            rowsPerPage: [50, 100, {text: 'All', value: -1}],
            headers: [
                {text: this.$t('name'), align: 'left', value: 'name'},
                {text: this.$t('enabled'), align: 'left', value: 'enabled'},
                {text: this.$t('notify.subject'), align: 'left', value: 'subject'},
                {text: this.$t('notify.email'), align: 'left', value: 'email'},
                // {text: this.$t('notify.query'), align: 'left', value: 'query'},
                {text: this.$t('notify.actions'), align: 'left', sortable: false},
            ],
            editNotifyDialog: {
                open: false
            },
            formValid: false,
            formNotify: {
                required: (value) => !!value || this.$t('notify.required'),
            },
            notifyAll: [],
            selectednotify: [],
            newNotify: {
                name: '',
                query: '',
                subject: ''
            }
        }
    },
    
    computed: {
        search: {
            get() {
                return this.$store.state.notify.search;
            },
            set(value) {
                this.$store.commit('notify/setSearch', value);
            }
        },

        pagination: {
            get() {
                return this.$store.state.notify.pagination;
            },
            set(value) {
                this.$store.commit('notify/setPagination', value);
            }
        },

        notify() {
            return this.notifyAll;
        }
    },

    methods: {
        onJsonChange (value) {
          console.log('value:', value)
        },

        async toggleEnable(enabled) {
            try {
                let promises = [];

                for (const notify of this.selectednotify) {
                    promises.push(this.$axios.post('notify/toggleEnable', {name: notify.name, enabled}));
                }

                await Promise.all(promises);
                const text = `${enabled ? this.$t('enabled') : this.$t('disabled') } all selected.`;
                this.$store.commit('showSnackbar', {type: 'success', text});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },


        async openEditNotifyDialog(notify) {
            this.$refs.editNotifyForm.reset();

            this.$nextTick(() => {
                if (notify) {
                    Object.assign(this.newNotify, notify);
                    this.newNotify.query = JSON.stringify( this.newNotify.query, null, 4);
                    delete this.newNotify.created_time;
                    delete this.newNotify.modified_time;
                }


                this.editNotifyDialog.open = true;
            });
        },

        async editNotify() {
            try {
                this.$refs.editNotifyForm.validate();
                if (!this.formValid) return;
                await this.$axios.patch(`notify/${this.newNotify.id}`,
                    {
                        name: this.newNotify.name,
                        subject: this.newNotify.subject,
                        email: this.newNotify.email,
                        query: JSON.parse(this.newNotify.query)
                    }
                );
                this.editNotifyDialog.open = false;
                this.$store.commit('showSnackbar', {type: 'success', text: this.$t('notify.saved')});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        }
    },

    async asyncData({store, error, app: {$axios, i18n}}) {
        try {

            const params = {filter: {}};
            let [notifyAll] = await Promise.all([
                $axios.$get('notify', {params})
            ]);

            return {notifyAll};
        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}