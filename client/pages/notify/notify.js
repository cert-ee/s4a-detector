import Highlight from 'vue-highlight-component';

export default {
    components: {Highlight},
    data() {
        return {
            rowsPerPage: [50, 100, {text: 'All', value: -1}],
            headers: [
                {text: this.$t('notify.name'), align: 'left', value: 'name'},
                {text: this.$t('notify.enabled'), align: 'left', value: 'enabled'},
                {text: this.$t('notify.subject'), align: 'left', value: 'subject'},
                {text: this.$t('notify.email'), align: 'left', value: 'email'},
                {text: this.$t('notify.query'), align: 'left', value: 'query'},
                {text: this.$t('notify.last_result'), align: 'left', value: 'last_result'},
                {text: this.$t('notify.last_logs'), align: 'left', value: 'last_logs'},
                {text: this.$t('notify.actions'), align: 'left', sortable: false},
            ],
            addEditEntryDialog: {
                open: false,
                isEditDialog: false
            },
            deleteEntryDialog: {
                open: false,
                title: ""
            },
            objectDialog: {
                data: {},
                open: false
            },
            deleteEntry: {},
            formValid: false,
            formEntry: {
                required: (value) => !!value || this.$t('notify.required'),
                query: (value) => this.checkValidJson(value) || this.$t('notify.query_not_valid_json')
            },
            selectedEntries: [],
            editEntry: {
                id: '',
                name: '',
                query: '',
                subject: '',
                new_entry: false
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

        entries: {
            get() {
                return this.$store.state.notify.entries;
            },
            set(value) {
                return this.$store.commit('notify/setEntries', value);
            }
        }
    },

    methods: {
        checkValidJson(value) {
            try {
                JSON.parse(value);
                return true;
            } catch (e) {
                return false;
            }
        },

        async openObjectDialog(value) {
            this.objectDialog.data = value;
            this.objectDialog.open = true;
        },

        async toggleEnable(enabled) {
            try {
                let promises = [], current_entries = [];

                for (const entry of this.selectedEntries) {
                    let entryCopy = Object.assign({}, entry);
                    entryCopy.enabled = enabled;
                    current_entries.push(entryCopy);
                    promises.push(this.$axios.post('notify/toggleEnable', {name: entry.name, enabled}));
                }

                await Promise.all(promises);

                for (const entry of current_entries) {
                    this.$store.commit('notify/updateEntry', entry);
                }

                const text = `${enabled ? this.$t('enabled') : this.$t('disabled') } all selected.`;
                this.$store.commit('showSnackbar', {type: 'success', text});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },

        async openDeleteDialog(entry) {
            this.deleteEntryDialog.open = true;
            this.deleteEntryDialog.title = entry.name;
            Object.assign(this.deleteEntry, entry);
        },

        async deleteEntryConfirm() {
            try {
                const deleted = await this.$axios.delete(`notify/${this.deleteEntry.id}`);

                this.$store.commit('notify/deleteEntry', this.deleteEntry);
                this.deleteEntryDialog.open = false;

                this.$store.commit('showSnackbar', {type: 'success', text: this.$t('notify.deleted')});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }
        },

        async openAddEditEntryDialog(entry) {
            this.$refs.addEditEntryForm.reset();

            this.$nextTick(() => {
                if (entry) {
                    Object.assign(this.editEntry, entry);
                    this.editEntry.query = JSON.stringify(this.editEntry.query, null, 4);
                    this.editEntry.new_entry = false;
                } else {
                    delete this.editEntry.id;
                    this.editEntry.new_entry = true;
                }

                delete this.editEntry.created_time;
                delete this.editEntry.modified_time;

                this.addEditEntryDialog.isEditDialog = !this.editEntry.new_entry;
                this.addEditEntryDialog.open = true;
            });

        },

        async addEditEntry() {
            try {
                this.$refs.addEditEntryForm.validate();
                if (!this.formValid) return;
                this.addEditEntryDialog.open = false;

                this.editEntry.enabled = !!this.editEntry.enabled;
                this.editEntry.query = JSON.parse(this.editEntry.query);

                const input = {
                    name: this.editEntry.name,
                    subject: this.editEntry.subject,
                    email: this.editEntry.email,
                    query: this.editEntry.query
                };

                if (this.editEntry.new_entry === true) {
                    //issue for handling dots in object key names
                    let create_without_query = Object.assign({}, input);
                    delete create_without_query.query;
                    let added = await this.$axios.$post('notify', create_without_query);
                    let patched = await this.$axios.$patch(`notify/${added.id}`, input);

                    this.$store.commit('notify/addEntry', patched);
                } else {
                    const patched = await this.$axios.$patch(`notify/${this.editEntry.id}`, input);
                    this.$store.commit('notify/updateEntry', patched);
                }

                this.$store.commit('showSnackbar', {type: 'success', text: this.$t('notify.saved')});
            } catch (err) {
                this.$store.dispatch('handleError', err);
            }

        }
    },

    async asyncData({store, error, app: {$axios, i18n}}) {
        try {

            const params = {filter: {}};
            let [entries] = await Promise.all([
                $axios.$get('notify', {params})
            ]);

            store.commit('notify/setEntries', entries);

        } catch (err) {
            if (err.response && err.response.status === 401) {
                return error({statusCode: 401, message: store.state.unauthorized});
            } else {
                return error({statusCode: err.statusCode, message: err.message});
            }
        }
    }
}