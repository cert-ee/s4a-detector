<template>
  <div>
    <v-toolbar app dark fixed class="blue-grey darken-2">
      <v-toolbar-side-icon @click.stop="$store.commit('toggleDrawer')"></v-toolbar-side-icon>
      <v-toolbar-title>{{ $t('dashboard.title') }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon :loading="refreshing" @click="refreshDashboard">
        <v-icon dark>refresh</v-icon>
        <span slot="loader" class="custom-loader">
          <v-icon dark>refresh</v-icon>
        </span>
      </v-btn>
      <v-spacer></v-spacer>
      <span v-if="$store.state.uniqueName != 'Unregistered'">ID: {{ $store.state.uniqueName }}</span>
      <span v-if="$store.state.uniqueName == 'Unregistered'">ID: {{ $store.state.temporaryName }}</span>
    </v-toolbar>
    <v-content>
      <v-container fluid grid-list-lg>
        <v-layout row wrap>
          <v-flex xs12>
            <div class="headline">{{ $t('dashboard.general') }}</div>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="account_circle" :title="$t('dashboard.registration_status')">
              <div class="headline success--text mb-2">
                <v-icon class="success--text">sentiment_very_satisfied</v-icon>
                {{ $t('dashboard.registration.to') }} {{$store.state.regUser}}
              </div>
              <span class="caption">{{ $t('dashboard.registration.central_api_token') }}:</span> <br />
              <span v-if="centralTokenVisible" style="word-break: break-all;">{{ centralToken }}</span>
              <v-btn v-if="!centralTokenVisible" small flat @click="centralTokenVisible = true">Show</v-btn>
            </dashboard-card>
            <dashboard-card v-else-if="$store.state.regStatus === 'Started' || $store.state.regStatus === 'Pending'"
                            icon="account_circle" :title="$t('dashboard.registration_status')">
              <div class="headline deep-orange--text">
                <v-icon class="deep-orange--text">history</v-icon>
               {{ $t('dashboard.registration.pending') }}
              </div>
            </dashboard-card>
            <dashboard-card v-else-if="$store.state.regStatus === 'Rejected'" icon="account_circle"
                            :title="$t('dashboard.registration_status')"
            >
              <div class="headline error--text mb-2">
                <v-icon color="error">sentiment_very_dissatisfied</v-icon>
                {{ $t('dashboard.registration.rejected') }}
              </div>
              <div v-if="$store.state.regRejectedReason">
                {{ $t('dashboard.registration.rejected_reason') }}: {{$store.state.regRejectedReason}}
              </div>
            </dashboard-card>
            <dashboard-card v-else icon="account_circle" :title="$t('dashboard.registration_status')">
              <div class="headline deep-orange--text">
                <v-icon class="deep-orange--text">help</v-icon>
                {{ $t('dashboard.registration.unknown') }}
              </div>
              <div>{{ $t('dashboard.registration.unknown_text') }}</div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="sync" :title="$t('dashboard.last_sync')">
              <div class="headline">
                <span v-if="centralStatus" class="blue--text">{{ lastSync | moment('from', 'now') }}</span>
                <span class="deep-orange--text" v-else>{{ $t('dashboard.central_sync.not_responding') }}</span>
                <v-btn icon :loading="syncing" @click="syncWithCentral">
                  <v-icon>refresh</v-icon>
                  <span slot="loader" class="custom-loader">
                    <v-icon>refresh</v-icon>
                  </span>
                </v-btn>
              </div>
            </dashboard-card>
            <dashboard-card v-else icon="sync" :title="$t('dashboard.last_sync')">
              <div class="headline deep-orange--text">
                {{ $t('dashboard.central_sync.disabled') }}
              </div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="security" :title="$t('dashboard.rules')">
              <div class="headline">
                <span v-if="rulesStatus" class="success--text">
                  <v-icon class="success--text">verified_user</v-icon>
                  {{ $t('dashboard.rules_sync.up_to_date') }}
                </span>
                <div v-else>
                  <span class="deep-orange--text">
                    {{ $t('dashboard.rules_sync.last_updated') }} {{ lastRulesUpdate | moment('from', 'now') }}
                  </span>
                  <v-spacer class="mb-2"></v-spacer>
                  <span class="deep-orange--text">{{ rulesAvailable }} {{ $t('dashboard.rules_sync.rules_available') }}</span>
                </div>
                <v-spacer class="mb-2"></v-spacer>
                <v-btn flat color="primary" :loading="$store.state.rulesSyncing" @click="updateRules">
                  {{ $t('dashboard.rules_sync.update_now') }}
                </v-btn>
              </div>
            </dashboard-card>
            <dashboard-card v-else icon="security" :title="$t('dashboard.rules')">
              <div class="headline deep-orange--text">
                {{ $t('dashboard.rules_sync.disabled') }}
              </div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/rules/review" style="text-decoration: none;" v-if="rule_drafts.count">
              <dashboard-card icon="security" :title="$t('dashboard.unpublished_rules')" link>
                <div class="headline deep-orange--text">
                  {{ rule_drafts.count }}
                </div>
              </dashboard-card>
            </nuxt-link>
            <dashboard-card icon="security" :title="$t('dashboard.unpublished_rules')" v-else>
              <div class="headline success--text">
                <v-icon class="success--text">check_circle</v-icon> 0
              </div>
            </dashboard-card>
          </v-flex>

          <v-flex xs12 class="mt-3">
            <div class="headline">{{ $t('dashboard.components') }}</div>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/components" style="text-decoration: none;">
              <dashboard-card icon="extension" :title="$t('dashboard.components_installed')" link>
                <div class="headline">
                  <span :class="installedComponents === installableComponents ? 'success--text' :
                    installedComponents === 0 ? 'error--text' : 'blue--text'"
                  >
                    {{ installedComponents }}
                  </span>
                  / {{ installableComponents }}
                </div>
              </dashboard-card>
            </nuxt-link>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/components" style="text-decoration: none;">
              <dashboard-card icon="warning" :title="$t('dashboard.components_problems')" link>
                <div class="headline">
                  <span v-if="installedComponents === 0" class="deep-orange--text">
                    {{ $t('dashboard.components_not_installed') }}
                  </span>
                  <span v-else-if="componentProblems === 0" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> 0
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ componentProblems }}
                  </span>


                  <span v-if="componentUpdatesAvailable > 0" class="warning--text">

                  <v-tooltip right>

                    <span slot="activator">
                      <v-icon class="warning--text">warning</v-icon> {{ componentUpdatesAvailable }}
                    </span>

                    <span>{{ componentUpdatesAvailable }} {{ $t('dashboard.component_updates_available') }}</span>
                  </v-tooltip>


                  </span>

                </div>
              </dashboard-card>
            </nuxt-link>
          </v-flex>
          <no-ssr>
            <v-flex v-if="$vuetify.breakpoint.smAndUp" sm4 lg6></v-flex>
          </no-ssr>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'kibana').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Kibana" link>
                <div class="headline">
                  <span v-if="!components.find(c => c.name === 'kibana').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'kibana').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </div>
              </dashboard-card>
            </a>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'moloch').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Moloch" link>
                <div class="headline">
                  <span v-if="!components.find(c => c.name === 'moloch').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'moloch').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </div>
              </dashboard-card>
            </a>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'netdata').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Netdata" link>
                <div class="headline">
                  <span v-if="!components.find(c => c.name === 'netdata').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'netdata').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </div>
              </dashboard-card>
            </a>
          </v-flex>

          <v-flex xs12 class="mt-3">
            <div class="headline">{{ $t('dashboard.alerts') }}</div>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm_on" :title="$t('dashboard.total_alerts_sent')">
              <div class="headline">
                <span class="blue--text">{{ alertsSentTotal }}</span>
              </div>
            </dashboard-card>
            <dashboard-card icon="alarm_on" :title="$t('dashboard.total_alerts_sent')" v-else>
              <div class="headline">
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm_add" :title="$t('dashboard.alerts_sent_today')">
              <div class="headline">
                <span class="blue--text">{{ alertsSentToday }}</span>
              </div>
            </dashboard-card>
            <dashboard-card icon="alarm_add" :title="$t('dashboard.alerts_sent_today')" v-else>
              <div class="headline">
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm" :title="$t('dashboard.alerts_last_sent')">
              <div class="headline">
                <span v-if="lastAlertsUpdate" class="blue--text">{{ lastAlertsUpdate | moment('from', 'now') }}</span>
                <span class="blue--text" v-else>No Alerts Sent</span>
              </div>
            </dashboard-card>
            <dashboard-card icon="alarm" :title="$t('dashboard.alerts_last_sent')" v-else>
              <div class="headline">
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </div>
            </dashboard-card>
          </v-flex>

          <v-flex xs12 class="mt-5"></v-flex>

          <v-flex xs6 sm4 lg3>
            <dashboard-card>
              <img src="~/assets/image/eu_logo_horizontal.jpg" width="100%" />
            </dashboard-card>
          </v-flex>

          <v-flex xs6 sm4 lg3>
            <dashboard-card>
              <img src="~/assets/image/sisejulgeolekufond.png" width="100%"/>
            </dashboard-card>
          </v-flex>

        </v-layout>
      </v-container>
    </v-content>
  </div>
</template>

<script src="./index.js"></script>

<style scoped>
  .custom-loader {
    animation: loader 1s infinite;
    display: flex;
  }
  @-moz-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-webkit-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-o-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
