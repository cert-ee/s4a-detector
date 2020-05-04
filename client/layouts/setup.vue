<template>
  <v-app>
    <v-toolbar app fixed dark class="blue-grey darken-2">
      <v-toolbar-title>{{$t("setup.title_toolbar")}}</v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid grid-list-lg>
        <nuxt />
      </v-container>
    </v-content>
  </v-app>
</template>