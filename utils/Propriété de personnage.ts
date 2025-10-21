export type Personnage = {
  id: string // identifiant unique du personnage
  nom: {nomcomplet: string; prenom?: string; surnom?: string} // nom du personnage, prénom et surnom optionnel
  age: number
  sexe: string
  taille: number
  poids: number
  langues: string
  alignement: string
  raceId: string
  backgroundId: string
  niveauGlobal: number
  classe: {
    1: { classeId: string; subclasseId: string; niveau: number } // classe principale
    2?: { classeId: string; subclasseId: string; niveau: number } // classe secondaire
  }
  xp: number // Valeur_Base:NiveauChoisie // expérience totale, palier et logique xp définie ailleurs
  dv: number // Valeur_Base:Classe // dés de vie, se cumulent selon les classes
  maitriseBonus: number // Valeur_Base:NiveauChoisie // bonus de maîtrise, dépend du niveau global
  pvActuels: number // points de vie actuels
  pvMax: number // points de vie maximum
  pvTmp: number // points de vie temporaires
  calculPvMax: {
    classe1: { niveauGlobal_1: string; par_niveau_apres_1: string };
    classe2: { par_niveau_apres_1: string }
  }
  CA: number // classe d'armure, peut être une valeur fixe ou une formule
  CalculCA: {
    base: string; // // Valeur_Base:Race //ex: 10 + modDEX
    bonusArmure: string; // ex: armure portée
  }
  vitesse: number // Valeur_Base:Race // Vitesse de déplacement en mètres
  nivFatigueActuel: number // Valeur_Base:Race // Niveau de fatigue actuel, chaque niveau a des effets spécifiques
  nivFatigueMax: number // Valeur_Base:Race // Niveau de fatigue maximum avant la mort
  initiative: string // modDEX + autres bonus/malus

  besoin: Array<Record<string, any>>
  [key: string]: any

  caracs: {
    force: { FOR: number; modFOR: number },// modFOR = Math.floor((FOR - 10) / 2)
    dexterite: { DEX: number; modDEX: number },// modDEX = Math.floor((DEX - 10) / 2)
    constitution: { CON: number; modCON: number }// modCON = Math.floor((CON - 10) / 2)
    intelligence: { INT: number; modINT: number },// modINT = Math.floor((INT - 10) / 2)
    sagesse: { SAG: number; modSAG: number },// modSAG = Math.floor((SAG - 10) / 2)
    charisme: { CHA: number; modCHA: number }// modCHA = Math.floor((CHA - 10) / 2)
  }
  competences: { // 1 si le personnage a la compétence, 0 sinon, si plusieurs fois la valeur est true alors on la compétence est expertisée (double le maitriseBonus)
    Athlétisme: boolean,
    Acrobaties: boolean,
    Escamotage: boolean,
    Discrétion: boolean,
    Arcanes: boolean,
    Histoire: boolean,
    Investigation: boolean,
    Nature: boolean,
    Religion: boolean,
    Dressage: boolean,
    Intuition: boolean,
    Médecine: boolean,
    Perception: boolean,
    Survie: boolean,
    Tromperie: boolean,
    Intimidation: boolean,
    Performance: boolean,
    Persuasion: boolean
  }

  proficiencies: Record<string, ProficiencyRank>
  savingThrows: string[]
  inspiration: boolean
  traits: string[]


// Gestion des features appliquées au personnage :
// issue du parcours de création et de l'évolution du personnage
// Permet de savoir quelles features sont appliquées au personnage pour gérer les effets en jeu (ex: bonus de compétence, résistance, etc.)
// Les features sont identifiées par leur ID, et renvoient aux listes d'ID des features associées sauvegardées (json brut) dans JDRDB_partieID
// Une feature peut en activer plusieurs autres (ex: un don qui donne accès à plusieurs compétences) donc on utilise un tableau d'ID (parent -> enfants)
// Lors de l'application des effets en jeu, on parcourt cette structure pour appliquer les effets de chaque feature et de ses enfants
// Une feature peut être ajoutée ou retirée dynamiquement (ex: gain/perte de don, changement de classe, etc.) en mettant à jour cette structure.
  featureIdsApply: Record<string, string[]>


  spellIds?: string[]
  spellcastingSpec?: SpellcastingSpec | null
  statBases?: StatBase | null

  // Gestion de l'équipement, Inventaire, poids, or, contenant etc.
  //Logique de jeu : le joueur intéragit avec son équipement via l'UI inventaire. Dans l'ui nous retrouvons des données : capacité avant malus, capacité maximal, poids transporté actuel,
  // or total, inventaire complet simplifié (chaque items de l'invenventaire et répartit par contenant (liste déroulable) et à une ligne constitué de : son nom, desrciption, poids unitaire, quantité, poids total de la ligne)
  // L'UI propose les slots d'équipement (voir materielSlots) sous forme de cases, au clic sur une case, on ouvre l'inventaire pour choisir un item à équiper dans le slot.
  // Le personnage possède des slots d'équipement (voir materielSlots) qui permettent d'équiper des items pour un accès rapide (aucun malus d'action pour les utiliser)
  // Les items équipés dans les slots sont aussi présent dans l'inventaire, mais marqués comme équipés.
  // Le poids total transporté est calculé en fonction de l'inventaire complet (items équipés et non équipés)
  // Le poids maximum transportable est géré via statBases (ex: force * 15 kg)
  // L'or total est géré via l'inventaire (items de type or, pièces d'or, etc.)
  materielSlots: {// Slots pour mettres des équipements (items) à disposition direct (aucun malus d'action pour les utiliser)
    Ceinture_gauche: string | null // limité au items étant d'une longueur inferieure à la moitié de la taille du personnage

    Ceinture_droite: string | null // limité au items étant d'une longueur inferieure à la moitié de la taille du personnage

    Dos_gauche: string | null // limité au items étant d'une longueur inferieure à la taille du personnage

    Dos_droit: string | null // limité au items étant d'une longueur inferieure à la taille du personnage

    Armure: string | null // armure légère, armure lourde, etc. peut être recouverte par un vêtement

    Vetement: string | null // Vêtement, Veste, etc.

    paquetage: string | null // sac à dos, besace, etc.

    accessoire: string | null // Montre, amulette, bague, etc. limite de 5


    equippedIds: string[]
    
  }
  descriptionPersonnage: {
    bio: string
    physique: string
    personnalite: string
    objectifs: string
    relations: string
    defauts: string
  }
  ui_template?: string | null
}

type SpellcastingSpec = {
  ability: string | null // carac associée aux jets de sort
  spellSaveDc: number | null
  spellAttackMod: number | null
  slots: Record<string, number | string>
  focusId: string | null
  description?: string | null
}




