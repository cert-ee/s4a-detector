<template>
  <div>
    <v-toolbar app dark fixed class="blue-grey darken-2">
      <v-toolbar-side-icon @click.stop="$store.commit('toggleDrawer')"></v-toolbar-side-icon>
      <v-toolbar-title>{{ $t('dashboard.components') }}</v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid grid-list-lg>
        <v-layout row wrap>
          <v-flex xs12>
            <v-card>
              <v-card-title class="mb-3">
                <v-layout row wrap>
                  <v-flex xs6>
                    <v-text-field append-icon="search" :label="$t('search')" single-line hide-details v-model="search" clearable></v-text-field>
                  </v-flex>
                </v-layout>
              </v-card-title>
              <v-card-text>
                <v-data-table :headers="headers" :items="components" :rows-per-page-items="rowsPerPage" :search="search"
                              :pagination.sync="pagination"
                >
                  <template slot="items" slot-scope="props">
                    <td>
                      <span v-if="props.item.web_url == 'false'">{{ props.item.friendly_name }}</span>
                      <a v-else :href="props.item.web_url" target="_blank">{{ props.item.friendly_name }}</a>
                    </td>
                    <td :class="props.item.status === true ? 'success--text' : 'error--text'">
                      <div v-if="props.item.installed === true">
                        <v-icon v-if="props.item.status === true" class="success--text">check_circle</v-icon>
                        <v-icon class="error--text" v-else>warning</v-icon>
                        {{ props.item.statusStr }}
                      </div>
                      <span v-else-if="props.item.installed === false" class="deep-orange--text">{{ $t('components.not_installed') }}</span>
                      <span v-else-if="props.item.enabled === false" class="deep-orange--text">{{ $t('disabled') }}</span>
                    </td>
                    <td>
                      <v-btn small color="warning" v-if="props.item.installed === true && props.item.restartable === true" :loading="props.item.loading"
                             @click="applyStateToComponent(props.item, 'restart')">
                        {{ $t('components.restart') }}
                      </v-btn>
                      <v-btn small color="primary" v-if="props.item.installed === false && props.item.installable"
                             :loading="props.item.loading" @click="applyStateToComponent(props.item, 'install')">
                        {{ $t('components.install') }}
                      </v-btn>
                      <v-btn small color="error" v-if="props.item.installed === true && props.item.installable"
                             :loading="props.item.loading" @click="applyStateToComponent(props.item, 'uninstall')">
                        {{ $t('components.uninstall') }}
                      </v-btn>

                      <v-btn small color="primary" v-if="props.item.installed === true && props.item.enabled === false && props.item.toggleable"
                             :loading="props.item.loading" @click="applyStateToComponent(props.item, 'enabled')">
                        {{ $t('components.enable') }}
                      </v-btn>
                      <v-btn small color="error" v-if="props.item.installed === true && props.item.enabled === true && props.item.toggleable"
                             :loading="props.item.loading" @click="applyStateToComponent(props.item, 'disabled')">
                        {{ $t('components.disable') }}
                      </v-btn>
                      <v-btn small info v-if="props.item.installed === true && props.item.enabled === true"
                             :loading="props.item.loading" @click="recheckComponentStatus(props.item)">
                        {{ $t('components.check_status') }}
                      </v-btn>
                    </td>
                    <td>
                        <div v-if="props.item.logs != false && props.item.logs != ' '">
                        <v-tooltip right>
                          <v-btn slot="activator" icon
                                 @click.stop="log = {name: props.item.friendly_name, data: props.item.logs }; logDialog = true"
                          >
                            <v-icon>view_list</v-icon>
                          </v-btn>
                          <span>{{ $t('components.view_stdout_log') }}</span>
                        </v-tooltip>
                      </div>
                        <div class="red--text" v-if="props.item.logs_error != false && props.item.logs_error != ' '">
                        <v-tooltip right>
                          <v-btn slot="activator" class="red--text" icon
                                 @click.stop="log = {name: props.item.friendly_name + ' error ', data: props.item.logs_error }; logDialog = true"
                          >
                            <v-icon>view_list</v-icon>
                          </v-btn>
                          <span>{{ $t('components.view_stderr_log') }}</span>
                        </v-tooltip>
                      </div>
                    </td>
                    <td :class="props.item.status === true ? 'success--text' : 'error--text'">{{ props.item.message }}</td>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-flex>

          <v-dialog v-model="logDialog" width="70%" lazy scrollable>
            <v-card>
              <v-card-title>
                <span class="headline">{{ log.name }} {{ $t('components.install_log') }}</span>
              </v-card-title>
              <v-card-text style="height: 500px;">
                <pre>{{ log.data }}</pre>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn flat @click="logDialog = false">{{ $t('close') }}</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-layout>
      </v-container>
    </v-content>
  </div>
</template>

<script src="./components.js"></script>