<template>
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
import { useTemplateRef } from 'vue'
import { avatarMenu } from './menu'

// Avatar
const menu = useTemplateRef('menu')
function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>
