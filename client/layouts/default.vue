<template>
    <v-app>
        <v-navigation-drawer app overflow dark width="250" v-model="drawer">
            <v-list class="pa-0" dark>
                <v-list-tile avatar ripple>
                    <v-list-tile-avatar>
                        <v-icon dark>account_circle</v-icon>
                    </v-list-tile-avatar>
                    <v-list-tile-content>
                        <v-list-tile-title>{{$store.state.user ? $store.state.user.username : 'Test User'}}
                        </v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>
            </v-list>
            <v-list class="pt-0" dense dark>
                <v-divider></v-divider>
                <v-subheader class="grey--text">Menu</v-subheader>
                <v-list-tile to="/" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>dashboard</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.dashboard') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile to="/components" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>extension</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.components') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile v-if="hasAdminRole" to="/settings" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>settings</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.settings') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile to="/tags" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>bookmark</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.tags') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile to="/notify" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>email</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.notify') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile to="/rulesets" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>track_changes</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.rulesets') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-group v-if="$store.state.rulesReview" v-model="rulesExpanded" group="/rules" no-action>
                    <v-list-tile slot="activator" to="/rules" exact ripple>
                        <v-list-tile-action>
                            <v-icon dark>track_changes</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                            <v-list-tile-title>{{ $t('menu.rules') }}</v-list-tile-title>
                        </v-list-tile-content>
                    </v-list-tile>
                    <v-list-tile to="/rules/review" exact ripple>
                        <v-list-tile-content>
                            <v-list-tile-title>{{ $t('menu.rules_review') }}</v-list-tile-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list-group>

                <v-list-tile v-else to="/rules" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>track_changes</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.rules') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile v-if="hasAdminRole" to="/users" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>people</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.users') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile v-if="$store.state.debugMode" @click.stop="showResetDemoConfirm" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>gavel</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.reset_demo') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-dialog v-model="resetDemoDialog" width="20%" lazy>
                    <v-card>
                        <v-card-text>
                            {{ $t('menu.reset_demo') }} ?
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn flat @click="resetDemoDialog = false">{{ $t('cancel') }}</v-btn>
                            <v-btn flat color="error" @click="resetDemo">{{ $t('reset') }}</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <v-divider></v-divider>
                <v-subheader class="grey--text">Versions</v-subheader>

                <v-list-tile ripple>
                    <v-list-tile-action>
                        server
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{$store.state.versions.server}}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile ripple>
                    <v-list-tile-action>
                        client
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{$store.state.versions.client}}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-list-tile ripple>
                    <v-list-tile-action>
                        main
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{$store.state.versions.main}}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

                <v-divider></v-divider>

                <v-list-tile @click.stop="sendFeedbackDialog = true" exact ripple>
                    <v-list-tile-action>
                        <v-icon dark>feedback</v-icon>
                    </v-list-tile-action>
                    <v-list-tile-content>
                        <v-list-tile-title>{{ $t('menu.send_feedback') }}</v-list-tile-title>
                    </v-list-tile-content>
                </v-list-tile>

            </v-list>
        </v-navigation-drawer>

        <nuxt/>

        <v-snackbar top :timeout="5000"
                    :color="$store.state.snackBar.type === 'error' ? 'error' :
                  $store.state.snackBar.type === 'success' ? 'success' : ''"
                    v-model="snackBar"
        >
            {{ $store.state.snackBar.text }}
            <v-btn dark flat @click="$store.commit('closeSnackbar')">{{ $t('close') }}</v-btn>
        </v-snackbar>

        <v-dialog v-model="sendFeedbackDialog" width="50%" lazy persistent>
            <v-card>
                <v-form v-model="formValid" ref="sendFeedbackForm" @submit.prevent="sendFeedback">
                    <v-card-title>
                        <span class="headline">{{ $t('menu.send_feedback') }}</span>
                    </v-card-title>
                    <v-card-text>
                        <v-container fluid grid-list-lg>
                            <v-layout row wrap>
                                <v-flex xs6>
                                    <v-textarea :label="$t('message')" v-model="feedback.message" required
                                                :rules="[rules.required]">
                                    </v-textarea>
                                </v-flex>
                                <v-flex xs6>
                                    <v-textarea :label="$t('comment')" v-model="feedback.comment"></v-textarea>
                                </v-flex>
                                <v-flex xs12>
                                    <v-textarea :label="$t('logs')" v-model="feedback.logs.data"></v-textarea>
                                </v-flex>
                            </v-layout>
                        </v-container>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn type="button" flat @click="clearFeedbackForm">{{ $t('clear_form') }}</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn type="button" flat @click="sendFeedbackDialog = false">{{ $t('cancel') }}</v-btn>
                        <v-btn type="submit" flat color="primary" :loading="feedbackLoading">{{ $t('menu.send_feedback')
                            }}
                        </v-btn>
                    </v-card-actions>
                </v-form>
            </v-card>
        </v-dialog>
    </v-app>
</template>

<script src="./default.js"></script>