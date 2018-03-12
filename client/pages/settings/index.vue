<template>
  <div>
    <v-toolbar app dark fixed class="blue-grey darken-2">
      <v-toolbar-side-icon @click.stop="$store.commit('toggleDrawer')"></v-toolbar-side-icon>
      <v-toolbar-title>{{ $t('menu.settings') }}</v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid grid-list-lg>
        <v-layout row wrap>
          <v-flex xs6>
            <v-card height="100%">
              <v-card-title primary-title>
                <div class="headline">{{ $t('settings.alerts') }}</div>
              </v-card-title>
              <v-card-text>
                <v-subheader>{{ $t('settings.alert_report_interval') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_alerts_check"
                                   @change="updateSetting('job_interval_alerts_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_minute')" :value="1"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_alerts_check"
                                   @change="updateSetting('job_interval_alerts_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_5_minutes')" :value="5"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_alerts_check"
                                   @change="updateSetting('job_interval_alerts_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_10_minutes')" :value="10"></v-radio>
                    </v-radio-group>
                  </v-flex>
                </v-layout>

                <v-subheader>{{ $t('settings.alerts_level') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.alerts_severity_all"
                                   @change="updateSetting('alerts_severity_all')"
                    >
                      <v-tooltip top>
                        <v-radio color="primary" slot="activator" :label="$t('settings.all_alerts')" :value="true"></v-radio>
                        <span>{{ alerts_tooltips.all }}</span>
                      </v-tooltip>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.alerts_severity_all"
                                   @change="updateSetting('alerts_severity_all')"
                    >
                      <v-tooltip top>
                        <v-radio color="primary" slot="activator" :label="$t('settings.critical_alerts')" :value="false"></v-radio>
                        <span>{{ alerts_tooltips.critical }}</span>
                      </v-tooltip>
                    </v-radio-group>
                  </v-flex>
                </v-layout>

                <v-subheader >{{ $t('settings.alerts_info_level') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.alerts_info_level_all"
                                   @change="updateSetting('alerts_info_level_all')"
                    >
                      <v-tooltip top>
                        <v-radio color="primary" slot="activator" :label="$t('settings.full')" :value="true"></v-radio>
                        <span>{{ alerts_tooltips.full }}</span>
                      </v-tooltip>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.alerts_info_level_all"
                                   @change="updateSetting('alerts_info_level_all')"
                    >
                      <v-tooltip top>
                        <v-radio color="primary" slot="activator" :label="$t('settings.limited')" :value="false"></v-radio>
                        <span>{{ alerts_tooltips.limited }}</span>
                      </v-tooltip>
                    </v-radio-group>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card height="100%">
              <v-card-title primary-title>
                <div class="headline">{{ $t('settings.rules') }}</div>
              </v-card-title>
              <v-card-text>
                <v-subheader>{{ $t('settings.rules_update_check_interval') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_rules_check"
                                   @change="updateSetting('job_interval_rules_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_15_minutes')" :value="15"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_rules_check"
                                   @change="updateSetting('job_interval_rules_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_30_minutes')" :value="30"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_rules_check"
                                   @change="updateSetting('job_interval_rules_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_60_minutes')" :value="60"></v-radio>
                    </v-radio-group>
                  </v-flex>
                </v-layout>

                <v-subheader>{{ $t('settings.automatic_rules_download') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.auto_rules"
                                   @change="updateSetting('auto_rules')"
                    >
                      <v-radio color="primary" :label="$t('enabled')" :value="true"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.auto_rules"
                                   @change="updateSetting('auto_rules')"
                    >
                      <v-radio color="primary" :label="$t('disabled')" :value="false"></v-radio>
                    </v-radio-group>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card height="100%">
              <v-card-title primary-title>
                <div class="headline">{{ $t('settings.network') }}</div>
              </v-card-title>
              <v-card-text>
                <v-subheader>{{ $t('settings.select_the_network_interfaces') }}</v-subheader>
                <v-divider></v-divider>
                <v-data-table :headers="interface_headers" :items="interfaces" hide-actions class="mb-4">
                  <template slot="items" slot-scope="props">
                    <td>{{ props.item.name }}</td>
                    <td>{{ props.item.state }}</td>
                    <td>{{ props.item.ip }}</td>
                    <td>
                      <v-checkbox color="primary" v-model="props.item.enabled"></v-checkbox>
                    </td>
                  </template>
                </v-data-table>
                <transition name="fade">
                  <div class="text-xs-right" v-if="interfacesChanged">
                    <v-btn color="primary" :loading="interface_loading" @click="applyInterfaceChanges">
                      {{ $t('settings.apply_changes') }}
                    </v-btn>
                  </div>
                  <div class="text-xs-right" v-else-if="!interfaces.some(function(i) { return i.enabled; })">
                    <p class="error--text">
                      {{ $t('settings.select_at_least_one_interface') }}
                    </p>
                  </div>
                </transition>
                <div v-if="nfsen.installed">
                  <v-subheader>NFsen {{ $t('settings.sampling_rate') }}</v-subheader>
                  <v-divider></v-divider>
                  <v-layout row wrap>
                    <v-flex xs6>
                      <v-text-field type="number" v-model="nfsenSamplingRate"></v-text-field>
                    </v-flex>
                    <v-flex xs6>
                      <transition name="fade">
                        <v-btn v-if="samplingRateChanged" color="primary" :loading="nfsen_loading" @click="applyNfsenChanges">
                          {{ $t('settings.apply_changes') }}
                        </v-btn>
                      </transition>
                    </v-flex>
                  </v-layout>
                </div>

                <v-subheader>Nginx SSL</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-subheader>{{ $t('settings.status') }}:
                      <span v-if="nginx.configuration.ssl_enabled" class="ml-2 success--text">{{ $t('enabled') }}</span>
                      <span class="ml-2 error--text" v-else>{{ $t('disabled') }}</span>
                    </v-subheader>
                  </v-flex>
                  <v-flex xs6 class="text-xs-right">
                    <v-btn color="error" v-if="nginx.configuration.ssl_enabled" :loading="nginx_loading" @click="disableSSL">
                      {{ $t('components.disable') }}
                    </v-btn>
                    <v-btn color="primary" @click.stop="nginxConfDialog = true">{{ $t('settings.nginx_configuration') }}</v-btn>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
          <v-flex xs6>
            <v-card height="100%">
              <v-card-title primary-title>
                <div class="headline">{{ $t('settings.general') }}</div>
              </v-card-title>
              <v-card-text>
                <v-subheader>{{ $t('settings.status_report_to_central') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_status_check"
                                   @change="updateSetting('job_interval_status_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_minute')" :value="1"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_status_check"
                                   @change="updateSetting('job_interval_status_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_5_minutes')" :value="5"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs4>
                    <v-radio-group v-model="settings.job_interval_status_check"
                                   @change="updateSetting('job_interval_status_check')"
                    >
                      <v-radio color="primary" :label="$t('settings.every_10_minutes')" :value="10"></v-radio>
                    </v-radio-group>
                  </v-flex>
                </v-layout>

                <v-subheader>{{ $t('settings.auto_upgrade') }}</v-subheader>
                <v-divider></v-divider>
                <v-layout row wrap>
                  <v-divider class="mb-3"></v-divider>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.auto_upgrade"
                                   @change="updateSetting('auto_upgrade')"
                    >
                      <v-radio color="primary" :label="$t('enabled')" :value="true"></v-radio>
                    </v-radio-group>
                  </v-flex>
                  <v-flex xs6>
                    <v-radio-group v-model="settings.auto_upgrade"
                                   @change="updateSetting('auto_upgrade')"
                    >
                      <v-radio color="primary" :label="$t('disabled')" :value="false"></v-radio>
                    </v-radio-group>
                  </v-flex>
                </v-layout>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>

      <v-dialog v-model="nginxConfDialog" width="80%" lazy persistent>
        <v-card>
          <v-form @submit.prevent="applyNginxChanges">
            <v-card-title>
              <span class="headline">Nginx SSL {{ $t('settings.nginx_configuration') }}</span>
            </v-card-title>
            <v-card-text>
              <v-container fluid grid-list-lg>
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-text-field :label="$t('settings.nginx_ssl_cert')" v-model="nginx.configuration.ssl_cert"
                                  multi-line required>
                    </v-text-field>
                  </v-flex>
                  <v-flex xs6>
                    <v-text-field :label="$t('settings.nginx_ssl_chain')" v-model="nginx.configuration.ssl_chain"
                                  multi-line required>
                    </v-text-field>
                  </v-flex>
                  <v-flex xs6>
                    <v-text-field :label="$t('settings.nginx_ssl_key')" v-model="nginx.configuration.ssl_key"
                                  multi-line required>
                    </v-text-field>
                  </v-flex>
                </v-layout>
              </v-container>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn type="button" flat @click="nginxConfDialog = false">{{ $t('cancel') }}</v-btn>
              <v-btn type="submit" flat color="primary" :loading="nginx_loading">{{ $t('save') }}</v-btn>
            </v-card-actions>
          </v-form>
        </v-card>
      </v-dialog>
    </v-content>
  </div>
</template>

<script src="./settings.js"></script>