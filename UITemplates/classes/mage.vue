<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2 text-indigo-400">Mage – Pouvoirs & Sorts</h2>
    <div class="mb-4">
      <div class="font-semibold">Trait de lanceur de sort :</div>
      <div class="text-sm text-gray-300">{{ spellcastingTrait }}</div>
    </div>
    <div v-if="hasGrimoire" class="mb-4">
      <div class="font-semibold">Grimoire :</div>
      <div class="text-sm text-gray-300">Votre grimoire est accessible.</div>
    </div>
    <div>
      <div class="font-semibold mb-2">Sorts connus :</div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <CardItemAventure
          v-for="sort in sorts"
          :key="sort.id"
          :item="sort"
          type="spell"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePersonnage } from '~/stores/personnage'
import CardItemAventure from '~/components/aventure/CardItemAventure.vue'

const personnage = usePersonnage()

const spellcastingTrait = computed(() => {
  // Exemple : récupère le trait de lanceur de sort depuis la fiche
  return personnage.spellcastingTrait || 'Aucun trait trouvé'
})

const hasGrimoire = computed(() => {
  // Exemple : vérifie la présence du grimoire
  return personnage.equipement?.includes('Grimoire')
})

const sorts = computed(() => {
  // Exemple : liste des sorts connus
  return personnage.spells || []
})
</script>

<style scoped>
/* Personnalisation possible */
</style>
