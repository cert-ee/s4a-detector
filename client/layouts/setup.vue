<template>
  <v-app toolbar>
    <v-toolbar fixed class="blue-grey darken-2" dark>
      <v-toolbar-title>{{$t("setup.title_toolbar")}}</v-toolbar-title>
    </v-toolbar>
    <main>
      <v-container fluid grid-list-lg>
        <nuxt />
      </v-container>
    </main>
  </v-app>
</template>