<template>
    <div>
        <v-toolbar app dark fixed class="blue-grey darken-2">
            <v-toolbar-side-icon @click.stop="$store.commit('toggleDrawer')"></v-toolbar-side-icon>
            <v-toolbar-title>{{ $t('menu.notify') }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <transition name="fade">
                <v-menu v-if="selectedEntries.length" offset-y>
                    <!--<v-btn color="primary" slot="activator">-->
                    <!--{{ $t('notify.add_tag') }}-->
                    <!--<v-icon right>expand_more</v-icon>-->
                    <!--</v-btn>-->
                    <!--<v-list>-->
                    <!--<v-list-tile v-for="tag in tagNames" :key="tag.id" @click="toggleTag(tag, true)">-->
                    <!--<v-list-tile-title>{{ tag.name }}</v-list-tile-title>-->
                    <!--</v-list-tile>-->
                    <!--</v-list>-->
                </v-menu>
            </transition>
            <!--<transition name="fade">-->
            <!--<v-menu v-if="selectedEntries.length" offset-y>-->
            <!--<v-btn color="error" slot="activator">-->
            <!--{{ $t('notify.remove_tag') }}-->
            <!--<v-icon right>expand_more</v-icon>-->
            <!--</v-btn>-->
            <!--<v-list>-->
            <!--<v-list-tile v-for="tag in tagNames" :key="tag.id" @click="toggleTag(tag, false)">-->
            <!--<v-list-tile-title>{{ tag.name }}</v-list-tile-title>-->
            <!--</v-list-tile>-->
            <!--</v-list>-->
            <!--</v-menu>-->
            <!--</transition>-->
            <v-spacer></v-spacer>
            <transition name="fade">
                <v-btn v-if="selectedEntries.length" color="success" @click="toggleEnable(true)">{{
                    $t('notify.enable')
                    }}
                </v-btn>
            </transition>
            <transition name="fade">
                <v-btn v-if="selectedEntries.length" color="error" @click="toggleEnable(false)">{{
                    $t('notify.disable')
                    }}
                </v-btn>
            </transition>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click.stop="openAddEditEntryDialog()">{{ $t('notify.add_notify') }}</v-btn>
        </v-toolbar>
        <v-content>
            <v-container fluid grid-list-lg>
                <v-layout row wrap justify-center>
                    <v-flex xs12 lg10>
                        <v-card>
                            <v-card-title class="mb-3">
                                <v-layout row wrap>
                                    <v-flex xs6>
                                        <v-text-field append-icon="search" :label="$t('search')" single-line
                                                      hide-details v-model="search" clearable></v-text-field>
                                    </v-flex>
                                </v-layout>
                            </v-card-title>
                            <v-card-text>
                                <v-data-table :headers="headers" :items="entries" :rows-per-page-items="rowsPerPage"
                                              :search="search"
                                              :pagination.sync="pagination" v-model="selectedEntries"
                                              select-all="primary" item-key="name"
                                >
                                    <template slot="items" slot-scope="props">
                                        <tr v-bind:class="{ 'grey--text': props.item.enabled == false }">
                                            <td>
                                                <v-checkbox color="primary" hide-details
                                                            v-model="props.selected"></v-checkbox>
                                            </td>
                                            <td>
                                                {{ props.item.name }}
                                            </td>
                                            <td>
                                                {{ props.item.enabled }}
                                            </td>
                                            <td>
                                                {{ props.item.subject }}
                                            </td>
                                            <td>
                                                {{ props.item.email }}
                                            </td>

                                            <td>
                                                <v-btn slot="activator" class="info--text" icon
                                                       @click.stop="openObjectDialog(props.item.query)">
                                                    <v-icon>view_list</v-icon>
                                                </v-btn>
                                            </td>

                                            <td>
                                                {{ props.item.last_result }}
                                            </td>

                                            <td>
                                                <v-btn slot="activator" class="info--text" icon
                                                       @click.stop="openObjectDialog(props.item.last_logs)">
                                                    <v-icon>view_list</v-icon>
                                                </v-btn>
                                            </td>

                                            <td>

                                                <v-icon color="primary" class="pointer"
                                                        @click.stop="openAddEditEntryDialog(props.item)">
                                                    edit
                                                </v-icon>
                                                <v-icon class="red--text pointer"
                                                        @click.stop="openDeleteDialog(props.item)">delete
                                                </v-icon>
                                            </td>
                                            <!--:loading="props.item.loading"-->
                                            <!--<td>-->
                                            <!--<v-switch color="primary" v-model="props.item.automatically_enable_new_rules"-->
                                            <!--@change="saveAutomaticUpdates(props.item)">-->
                                            <!--</v-switch>-->
                                            <!--</td>-->
                                        </tr>
                                    </template>
                                </v-data-table>
                            </v-card-text>
                        </v-card>
                    </v-flex>

                    <v-dialog v-model="deleteEntryDialog.open" width="20%" lazy>
                        <v-card>
                            <v-card-text>
                                {{ $t('notify.delete') }} {{ deleteEntryDialog.title }}?
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn flat @click="deleteEntryDialog.open = false">{{ $t('notify.cancel') }}</v-btn>
                                <v-btn flat color="error" @click="deleteEntryConfirm">{{ $t('notify.delete') }}</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>

                    <v-dialog v-model="addEditEntryDialog.open" width="50%">
                        <v-card>
                            <v-form v-model="formValid" ref="addEditEntryForm" @submit.prevent="addEditEntry">
                                <v-card-title>
                                    <span class="headline">{{ addEditEntryDialog.isEditDialog ? $t('notify.edit_notify') : $t('notify.add_notify') }}</span>
                                </v-card-title>
                                <v-card-text>
                                    <v-container grid-list-lg>
                                        <v-layout row wrap>
                                            <v-flex xs4>
                                                <v-text-field :label="$t('name')" v-model="editEntry.name"
                                                              required
                                                              :rules="[formEntry.required]">
                                                </v-text-field>
                                            </v-flex>
                                            <v-flex xs4>
                                                <v-text-field :label="$t('notify.subject')"
                                                              v-model="editEntry.subject"
                                                              required
                                                              :rules="[formEntry.required]">
                                                </v-text-field>
                                            </v-flex>
                                            <v-flex xs4>
                                                <v-text-field :label="$t('notify.email')" v-model="editEntry.email"
                                                              required
                                                              :rules="[formEntry.required]">
                                                </v-text-field>
                                            </v-flex>
                                            <v-flex xs12>
                                                <v-textarea
                                                        v-model="editEntry.query"
                                                        auto-grow required
                                                        :rules="[formEntry.required, formEntry.query ]"
                                                ></v-textarea>
                                            </v-flex>
                                        </v-layout>
                                    </v-container>
                                </v-card-text>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn type="button" flat @click="addEditEntryDialog.open = false">{{$t('cancel')}}
                                    </v-btn>
                                    <v-btn type="submit" flat color="primary">{{$t('save') }}</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-card>
                    </v-dialog>

                    <v-dialog v-model="objectDialog.open" width="50%" lazy>
                        <v-card>
                            <v-card-text>
                                <highlight>{{ objectDialog.data }}</highlight>
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn flat @click="objectDialog.open = false">{{ $t('notify.close') }}</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>

                </v-layout>
            </v-container>
        </v-content>
    </div>
</template>

<script src="./notify.js"></script>