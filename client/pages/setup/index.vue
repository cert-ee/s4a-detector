<template>
  <v-layout row wrap justify-center>
    <v-flex xs8>
      <v-stepper v-model="currentStep">
        <v-stepper-header>
          <template v-for="(step, index) in steps">
            <v-stepper-step :step="index+1"
                            :editable="(index === 0 && currentStep < steps.length) ||
                                (step.complete && formValid &&
                                interfaces.some(function(i) { return i.install; }) && currentStep < steps.length)"
                            :complete="step.complete"
            >
              {{ step.name }}
            </v-stepper-step>
            <v-divider v-if="index < steps.length-1"></v-divider>
          </template>
        </v-stepper-header>
        <v-stepper-content step="1" class="text-xs-center">
          <v-layout row wrap>
            <v-flex xs12>
              <div class="display-1">{{ $t('setup.welcome') }}</div>
              <v-divider class="mb-5"></v-divider>
              <p>{{ $t('setup.only_a_minute') }}</p>
              <p>{{ $t('setup.only_a_minute_2') }}</p>
              <img src="~/assets/image/eu_logo_horizontal.jpg" width="35%" class="mb-4"/>
            </v-flex>
            <v-flex xs12 class="text-xs-right">
              <v-btn color="primary" @click="currentStep++; steps[0].complete = true">{{ $t('continue') }}</v-btn>
            </v-flex>
          </v-layout>
        </v-stepper-content>
        <v-stepper-content step="2">
          <v-form v-model="formValid">
            <v-layout row wrap>
              <v-flex xs6>
                <v-text-field :label="$t('setup.first_name')" required v-model="registration.first_name"
                              :rules="[rules.required]"></v-text-field>
              </v-flex>
              <v-flex xs6>
                <v-text-field :label="$t('setup.last_name')" required v-model="registration.last_name"
                              :rules="[rules.required]"></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field :label="$t('setup.organization')" required v-model="registration.organization_name"
                              :rules="[rules.required]"></v-text-field>
              </v-flex>
              <v-flex xs6>
                <v-text-field :label="$t('setup.email')" required v-model="registration.contact_email"
                              :rules="[rules.required, rules.email]"></v-text-field>
              </v-flex>
              <v-flex xs6>
                <v-text-field :label="$t('setup.phone_number')" required v-model="registration.contact_phone"
                              :rules="[rules.required]"></v-text-field>
              </v-flex>
              <v-flex xs6 class="text-xs-left">
                <v-btn @click="currentStep--">{{$t('back')}}</v-btn>
              </v-flex>
              <v-flex xs6 class="text-xs-right">
                <v-btn color="primary" :disabled="!formValid" @click="currentStep++; steps[1].complete = true">
                  {{ $t('continue') }}
                </v-btn>
              </v-flex>
            </v-layout>
          </v-form>
        </v-stepper-content>
        <v-stepper-content step="3">
          <v-layout row wrap>
            <v-flex xs12 class="text-xs-center">
              <p class="headline">{{ $t('settings.select_the_network_interfaces') }}</p>
            </v-flex>
            <v-flex xs12 class="mb-3">
              <v-data-table :headers="interface_headers" :items="interfaces"
                            :pagination.sync="interface_pagination" hide-actions>
                <template slot="items" slot-scope="props">
                  <td>{{ props.item.name }}</td>
                  <td>{{ props.item.state }}</td>
                  <td>{{ props.item.ip }}</td>
                  <td>
                    <v-checkbox color="primary" :disabled="props.item.error === true" v-model="props.item.install"></v-checkbox>
                  </td>
                </template>
              </v-data-table>

              <v-flex xs12 class="text-xs-right" v-if="!interfaces.some(function(i) { return i.install; })">
                <p class="error--text">{{ $t('settings.select_at_least_one_interface') }}</p>
              </v-flex>


              <v-divider class="mb-3"></v-divider>
              <v-flex xs12 class="text-xs-center">
                <p class="headline">{{ $t('setup.recommended_specifications') }}</p>
                <a :href="$t('setup.recommended_specifications_docs_url')" target="_blank" >
                  {{$t('setup.recommended_specifications_docs_url')}}
                </a>
              </v-flex>

              <v-divider class="mb-3"></v-divider>
              <v-flex xs12 class="text-xs-center">
                <p class="headline" >{{$t('setup.sys_cpu')}}</p>
                {{system_info.cpu.model}} | {{$t('setup.sys_cpu_cores')}} {{system_info.cpu.count}}
              </v-flex>

              <v-divider class="mb-3"></v-divider>

              <v-flex xs12 class="text-xs-center">
                <p class="headline" >{{$t('setup.sys_mem')}}</p>
                {{ system_info.mem | kbytesToSize }}
              </v-flex>


              <v-divider class="mb-3"></v-divider>


              <v-flex xs12 class="text-xs-center">
                <p class="headline">{{$t('setup.sys_disks')}}</p>

              </v-flex>
              <v-data-table :headers="disks_headers" :items="system_info.disks" hide-actions>
                <template slot="items" slot-scope="props">
                  <td>{{ props.item.mount }}</td>
                  <td>{{ props.item.part }}</td>
                  <td>{{ props.item.type }}</td>
                  <td>{{ props.item.size }}</td>
                  <td>{{ props.item.free }}</td>
                </template>
              </v-data-table>

            </v-flex>
            <v-flex xs6 class="text-xs-left">
              <v-btn @click="currentStep--">{{$t('back')}}</v-btn>
            </v-flex>
            <v-flex xs6 class="text-xs-right">
              <v-btn color="primary" :disabled="!interfaces.some(function(i) { return i.install; })"
                     @click="currentStep++; steps[2].complete = true"
              >
                {{$t('continue')}}
              </v-btn>
            </v-flex>
          </v-layout>
        </v-stepper-content>
        <v-stepper-content step="4">
          <v-layout row wrap>
            <v-flex xs12 class="mb-3">
              <v-data-table :headers="component_headers" :items="components_all"
                            :pagination.sync="component_pagination" hide-actions>
                <template slot="items" slot-scope="props">
                  <td>{{ props.item.friendly_name }}</td>
                  <td>{{ props.item.message }}</td>
                  <td>
                    <v-checkbox color="primary" :disabled="props.item.preset === true || props.item.installed === true"
                                v-model="props.item.going_to_install"></v-checkbox>
                  </td>
                </template>
              </v-data-table>
            </v-flex>
            <v-flex xs6 class="text-xs-left">
              <v-btn @click="currentStep--">{{$t('back')}}</v-btn>
            </v-flex>
            <v-flex xs6 class="text-xs-right">
              <v-btn color="primary" @click="currentStep++; steps[3].complete = true">{{$t('continue')}}</v-btn>
            </v-flex>
          </v-layout>
        </v-stepper-content>
        <v-stepper-content step="5">
          <v-layout row wrap>
            <v-flex xs6 class="mb-3">
              <v-card height="100%">
                <v-card-title primary-title>
                  <div class="headline">{{$t('setup.register_to')}}</div>
                </v-card-title>
                <v-card-text>
                  <p>{{ registration.first_name }} {{ registration.last_name }}</p>
                  <p>{{ registration.organization_name }}</p>
                  <p>{{ registration.contact_email }}</p>
                  <p>{{ registration.contact_phone }}</p>
                </v-card-text>
              </v-card>
            </v-flex>
            <v-flex xs6 class="mb-3">
              <v-card height="100%">
                <v-card-title primary-title>
                  <div class="headline">{{ $t('setup.items_to_install') }}</div>
                </v-card-title>
                <v-card-text>
                  <p v-for="component in components_all" v-if="component.going_to_install">
                    {{ component.friendly_name }}</p>
                </v-card-text>
              </v-card>
            </v-flex>
            <v-flex xs6 class="text-xs-left">
              <v-btn @click="currentStep--">{{$t('back')}}</v-btn>
            </v-flex>
            <v-flex xs6 class="text-xs-right">
              <v-btn color="primary" @click="runSetup(false)">Install components</v-btn>
              <v-btn v-if="$store.state.debugMode" color="warning" @click="runSetup(true)">Registration only ( demo )</v-btn>
            </v-flex>
          </v-layout>
        </v-stepper-content>
        <v-stepper-content step="6">
          <v-layout row wrap>
            <v-flex xs12 class="text-xs-center mb-3" >
              <div class="display-1" v-if="feedback_button == false && registration_button == false && finish_button == false">
                {{ $t('setup.installation') }}
              </div>
              <div class="display-1 red--text" v-if="feedback_button">{{ $t('setup.installation_failed') }}</div>
              <div class="display-1 warning--text" v-if="registration_button">{{ $t('setup.registration_failed') }}</div>
              <div class="display-1 success--text" v-if="finish_button">{{ $t('setup.installation_done') }}</div>
              <v-divider></v-divider>
            </v-flex>
            <v-flex xs12 class="mb-3">
              <v-data-table :headers="install_headers" :items="components_all"
                            :pagination.sync="install_pagination" hide-actions>
                <template slot="items" slot-scope="props">
                  <td>{{ props.item.friendly_name }}</td>
                  <td>
                    <v-progress-circular v-if="props.item.loading" indeterminate class="primary--text"></v-progress-circular>
                    <span class="mr-3" v-if="props.item.going_to_install == false">
                      <v-icon>check_circle</v-icon> {{ $t('setup.item_skipped') }}
                    </span>
                    <span class="mr-3" v-if="props.item.after_approval == true">
                      <v-icon>check_circle</v-icon> {{ $t('setup.item_telegraf_later') }}
                    </span>
                    <div v-if="props.item.salt_done">
                      <span class="success--text">
                        <span class="mr-3" v-if="props.item.installed">
                          <v-icon class="green--text">check_circle</v-icon> {{ $t('setup.item_installed') }}
                        </span>
                      </span>
                      <span class="red--text">
                        <span class="mr-3" v-if="props.item.installed == false">
                          <v-icon class="red--text">info</v-icon> {{ $t('setup.item_errors') }}
                        </span>
                      </span>
                      <span v-if="props.item.logs != false">
                        <v-tooltip right>
                          <v-btn icon slot="activator"
                                 @click.stop="log = {name: props.item.friendly_name, data: props.item.logs }; logDialog = true"
                          >
                            <v-icon>view_list</v-icon>
                          </v-btn>
                          <span>{{ $t('setup.view_stdout_log') }}</span>
                        </v-tooltip>
                      </span>
                      <span class="red--text" v-if="props.item.logs_error != false">
                        <v-tooltip right>
                          <v-btn class="red--text" icon slot="activator"
                                 @click.stop="log = {name: props.item.friendly_name + ' error ', data: props.item.logs_error }; logDialog = true"
                          >
                            <v-icon>view_list</v-icon>
                          </v-btn>
                          <span>{{ $t('setup.view_stderr_log') }}</span>
                        </v-tooltip>
                      </span>
                    </div>
                  </td>
                </template>
              </v-data-table>
            </v-flex>

            <v-flex xs12 class="mb-3" v-if="feedback_result">

              <v-flex xs12 class="text-xs-left"  >
                <p class="red--text title">{{ $t('setup.setup_failed') }}</p>
                <p>
                  {{ $t('setup.feedback_case_number') }}: <b>{{feedback_result.case_number}}</b> <br/>
                  <br/><br/>
                  <a :href="feedback_result.faq_url" v-if="feedback_result.faq_url" target="_blank">{{feedback_result.faq_url }}</a> <br/>
                  <br/><br/>
                </p>
              </v-flex>
            </v-flex>


            <v-flex xs12 class="mb-3" v-if="feedback_button" >

              <v-flex xs12 class="text-xs-left"  >
              <p class="red--text title">{{ $t('setup.setup_failed') }}</p>
              <p>
                {{ $t('setup.setup_failed_extra') }}
              </p>
                <p>
                {{ $t('setup.setup_failed_extra_2') }}
                </p>
            </v-flex>

              <v-flex xs12 class="mb-3">
                <v-text-field label="Optional comment" v-model="feedback_comment" multi-line ></v-text-field>
              </v-flex>
            <v-flex xs12 class="text-xs-right">
              <v-btn color="error" @click="sendFeedback" >{{ $t('setup.send_feedback') }}</v-btn>
            </v-flex>
            </v-flex>

            <v-flex xs12 class="text-xs-right">
              <v-btn color="warning" @click="postRegistration" v-if="registration_button">{{ $t('setup.repost_registration') }}</v-btn>
            </v-flex>

            <v-flex xs12 class="text-xs-right">
              <v-btn color="primary" @click="$router.push('/')" v-if="finish_button">{{ $t('continue') }}</v-btn>
            </v-flex>
          </v-layout>
        </v-stepper-content>
      </v-stepper>
    </v-flex>

    <v-dialog v-model="logDialog" width="70%" lazy scrollable>
      <v-card>
        <v-card-title>
          <span class="headline">{{ log.name }} {{ $t('setup.install_log') }}</span>
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

    <v-snackbar top color="error" :timeout="5000" v-model="errorSnack">
      {{ errorText }}
      <v-btn dark flat @click="errorSnack = false">{{ $t('ok') }}</v-btn>
    </v-snackbar>
  </v-layout>
</template>

<script src="./setup.js"></script>
