<template>
  <div ref="dashboard">
    <v-navigation-drawer persistent dark overflow v-model="drawer" style="display: none;"></v-navigation-drawer>
    <v-toolbar fixed class="blue-grey darken-2" dark>
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
    <main>
      <v-container fluid grid-list-lg>
        <v-layout row wrap>
          <v-flex xs12>
            <h5>{{ $t('dashboard.general') }}</h5>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="account_circle" :title="$t('dashboard.registration_status')">
              <h5 class="success--text">
                <v-icon class="success--text">sentiment_very_satisfied</v-icon>
                {{ $t('dashboard.registration.to') }} {{$store.state.regUser}}
              </h5>
              {{ $t('dashboard.registration.central_api_token') }}: <br />
              <span v-if="centralTokenVisible" style="word-break: break-all;">{{ centralToken }}</span>
              <v-btn v-if="!centralTokenVisible" flat @click="centralTokenVisible = true">Show</v-btn>
            </dashboard-card>
            <dashboard-card v-else-if="$store.state.regStatus === 'Started' || $store.state.regStatus === 'Pending'"
                            icon="account_circle" :title="$t('dashboard.registration_status')">
              <h5 class="deep-orange--text">
                <v-icon class="deep-orange--text">history</v-icon>
               {{ $t('dashboard.registration.pending') }}
              </h5>
            </dashboard-card>
            <dashboard-card v-else-if="$store.state.regStatus === 'Rejected'" icon="account_circle"
                            :title="$t('dashboard.registration_status')"
            >
              <h5 class="error--text">
                <v-icon class="error--text">sentiment_very_dissatisfied</v-icon>
                {{ $t('dashboard.registration.rejected') }}
              </h5>
              <div v-if="$store.state.regRejectedReason">
                {{ $t('dashboard.registration.rejected_reason') }}: {{$store.state.regRejectedReason}}
              </div>
            </dashboard-card>
            <dashboard-card v-else icon="account_circle" :title="$t('dashboard.registration_status')">
              <h5 class="deep-orange--text">
                <v-icon class="deep-orange--text">help</v-icon>
                {{ $t('dashboard.registration.unknown') }}
              </h5>
              <div>{{ $t('dashboard.registration.unknown_text') }}</div>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="sync" :title="$t('dashboard.last_sync')">
              <h5>
                <span v-if="centralStatus" class="blue--text">{{ lastSync | moment('from', 'now') }}</span>
                <span class="deep-orange--text" v-else>{{ $t('dashboard.central_sync.not_responding') }}</span>
                <v-btn icon :loading="syncing" @click="syncWithCentral">
                  <v-icon>refresh</v-icon>
                  <span slot="loader" class="custom-loader">
                    <v-icon>refresh</v-icon>
                  </span>
                </v-btn>
              </h5>
            </dashboard-card>
            <dashboard-card v-else icon="sync" :title="$t('dashboard.last_sync')">
              <h5 class="deep-orange--text">
                {{ $t('dashboard.central_sync.disabled') }}
              </h5>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="security" :title="$t('dashboard.rules')">
              <h5>
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
                <v-btn flat primary :loading="$store.state.rulesSyncing" @click="updateRules">
                  {{ $t('dashboard.rules_sync.update_now') }}
                </v-btn>
              </h5>
            </dashboard-card>
            <dashboard-card v-else icon="security" :title="$t('dashboard.rules')">
              <h5 class="deep-orange--text">
                {{ $t('dashboard.rules_sync.disabled') }}
              </h5>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/rules/review" style="text-decoration: none;" v-if="rule_drafts.count">
              <dashboard-card icon="security" :title="$t('dashboard.unpublished_rules')" link>
                <h5 class="deep-orange--text">
                  {{ rule_drafts.count }}
                </h5>
              </dashboard-card>
            </nuxt-link>
            <dashboard-card icon="security" :title="$t('dashboard.unpublished_rules')" v-else>
              <h5 class="success--text">
                <v-icon class="success--text">check_circle</v-icon> 0
              </h5>
            </dashboard-card>
          </v-flex>

          <v-flex xs12 class="mt-3">
            <h5>{{ $t('dashboard.components') }}</h5>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/components" style="text-decoration: none;">
              <dashboard-card icon="extension" :title="$t('dashboard.components_installed')" link>
                <h5>
                  <span :class="installedComponents === installableComponents ? 'success--text' :
                    installedComponents === 0 ? 'error--text' : 'blue--text'"
                  >
                    {{ installedComponents }}
                  </span>
                  / {{ installableComponents }}
                </h5>
              </dashboard-card>
            </nuxt-link>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <nuxt-link to="/components" style="text-decoration: none;">
              <dashboard-card icon="warning" :title="$t('dashboard.components_problems')" link>
                <h5>
                  <span v-if="installedComponents === 0" class="deep-orange--text">
                    {{ $t('dashboard.components_not_installed') }}
                  </span>
                  <span v-else-if="componentProblems === 0" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> 0
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ componentProblems }}
                  </span>
                </h5>
              </dashboard-card>
            </nuxt-link>
          </v-flex>
          <v-flex v-if="$vuetify.breakpoint.smAndUp" sm4 lg6></v-flex>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'evebox').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Evebox" link>
                <h5>
                  <span v-if="!components.find(c => c.name === 'evebox').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'evebox').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </h5>
              </dashboard-card>
            </a>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'moloch').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Moloch" link>
                <h5>
                  <span v-if="!components.find(c => c.name === 'moloch').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'moloch').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </h5>
              </dashboard-card>
            </a>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <a :href="components.find(c => c.name === 'netdata').web_url" target="_blank" style="text-decoration: none;">
              <dashboard-card icon="widgets" title="Netdata" link>
                <h5>
                  <span v-if="!components.find(c => c.name === 'netdata').installed" class="deep-orange--text">
                    {{ $t('components.not_installed') }}
                  </span>
                  <span v-else-if="components.find(c => c.name === 'netdata').status" class="success--text">
                    <v-icon class="success--text">check_circle</v-icon> {{ $t('ok') }}
                  </span>
                  <span class="error--text" v-else>
                    <v-icon class="error--text">warning</v-icon> {{ $t('fail') }}
                  </span>
                </h5>
              </dashboard-card>
            </a>
          </v-flex>

          <v-flex xs12 class="mt-3">
            <h5>{{ $t('dashboard.alerts') }}</h5>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm_on" :title="$t('dashboard.total_alerts_sent')">
              <h5>
                <span class="blue--text">{{ alertsSentTotal }}</span>
              </h5>
            </dashboard-card>
            <dashboard-card icon="alarm_on" :title="$t('dashboard.total_alerts_sent')" v-else>
              <h5>
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </h5>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm_add" :title="$t('dashboard.alerts_sent_today')">
              <h5>
                <span class="blue--text">{{ alertsSentToday }}</span>
              </h5>
            </dashboard-card>
            <dashboard-card icon="alarm_add" :title="$t('dashboard.alerts_sent_today')" v-else>
              <h5>
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </h5>
            </dashboard-card>
          </v-flex>
          <v-flex xs6 sm4 lg3>
            <dashboard-card v-if="$store.state.regStatus === 'Approved' || $store.state.regStatus === 'Completed'"
                            icon="alarm" :title="$t('dashboard.alerts_last_sent')">
              <h5>
                <span v-if="lastAlertsUpdate" class="blue--text">{{ lastAlertsUpdate | moment('from', 'now') }}</span>
                <span class="blue--text" v-else>No Alerts Sent</span>
              </h5>
            </dashboard-card>
            <dashboard-card icon="alarm" :title="$t('dashboard.alerts_last_sent')" v-else>
              <h5>
                <span class="deep-orange--text">{{ $t('dashboard.alerts_disabled') }}</span>
              </h5>
            </dashboard-card>
          </v-flex>

          <v-flex xs12 class="mt-5"></v-flex>

          <v-flex xs6 sm4 lg3>
            <dashboard-card>
              <img src="~/assets/image/eu_logo_horizontal.jpg" width="100%" />
            </dashboard-card>
          </v-flex>

        </v-layout>
      </v-container>
    </main>
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