<template>
  <Drawer v-model:visible="isDrawerShown" class="!bg-stone-50">
    <template #header>
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold">
        <span>gudang-fe</span>
      </RouterLink>
    </template>

    <nav class="grid gap-2 text-lg font-medium">
      <PanelMenuComponent />
    </nav>

    <template #footer>
      <div class="mt-auto">
        <Card>
          <template #title>Upgrade to Pro</template>
          <template #subtitle>
            Unlock all features and get unlimited access to our support team.
          </template>
          <template #content>
            <Button class="w-full"> Upgrade </Button>
          </template>
        </Card>
      </div>
    </template>
  </Drawer>

  <Button class="md:!hidden lg:!hidden" icon="pi pi-bars" @click="toggleDrawer" />

  <div class="w-full flex-1">
    <form>
      <div class="relative">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText placeholder="Search" />
        </IconField>
      </div>
    </form>
  </div>

  <Avatar
    icon="pi pi-user"
    class="mr-2"
    size="normal"
    aria-controls="account_menu"
    @click="toggle"
  />
  <Menu ref="menu" id="account_menu" :model="avatarMenu" :popup="true" />
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { ref, useTemplateRef } from 'vue'
import { avatarMenu } from './menu'
import PanelMenuComponent from './PanelMenuComponent.vue'

// Drawer
const isDrawerShown = ref(false)
function toggleDrawer() {
  isDrawerShown.value = !isDrawerShown.value
}

// Avatar
const menu = useTemplateRef('menu')
function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>
