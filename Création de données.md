DATA AUTHORING GUIDE (v1)

Où le mettre : docs/DATA_AUTHORING_GUIDE.md
Objectif : produire des fichiers JSON exploitables directement par le moteur (EffectEngine) et la création de PJ.

0) Principes

Tout effet est dans effects[], sous forme d’objets homogènes :
{ id?, type, source?, conditions?, priority?, payload }

Les choix pour l’utilisateur sont des effets type: "choice" (jamais du texte libre).

Les conditions d’application (par niveau, classe…) se mettent dans conditions.

Les IDs sont en kebab/underscore stable, sans espace (ex: mage_spellcasting_lv1).

Aucune magie dans le code : si c’est dans effects, le moteur l’applique; si c’est un choice, l’UI le propose.

1) Arborescence (recommandée)
/classes/
  mage.json
  guerrier.json
/subclasses/
  mage_evocation.json
/races/
  humain.json
  elfe.json
  haut_elfe.json
/features/
  tissage_de_sort.json
/spells/
  bouclier.json
  lumiere.json
  projectile_magique.json


Tu peux ajouter /backgrounds, /items si besoin.
classes/<foo>.json et races/<bar>.json contiennent features[]; les spells sont unitaires.

2) Schémas de base (copie-colle)
2.1 Race (template)
{
  "id": "humain",
  "nom": "Humain",
  "description": "Bonus polyvalent, un choix de compétence.",
  "features": [
    {
      "id": "humain_racial_stats",
      "type": "stat_modifier",
      "source": "humain",
      "payload": { "stat": "all", "delta": 1, "permanent": true }
    },
    {
      "id": "humain_bonus_competence",
      "type": "choice",
      "source": "humain",
      "payload": {
        "ui_id": "humain_bonus_competence",
        "category": "skill",
        "choose": 1,
        "from": [
          "athletisme","acrobaties","arcanes","histoire","investigation",
          "perception","persuasion","intimidation","survie","medecine",
          "religion","discretion"
        ],
        "expertise": false,
        "source_label": "Humain"
      }
    }
  ]
}

2.2 Classe (template)
{
  "id": "mage",
  "nom": "Mage",
  "description": "Lanceur de sorts érudit.",
  "features": [
    {
      "id": "mage_spellcasting_lv1",
      "type": "spellcasting_feature",
      "source": "mage",
      "priority": 80,
      "conditions": { "all": [ { "kind": "level_gte", "class": "mage", "value": 1 } ] },
      "payload": {
        "ability": "intelligence",
        "spell_save_dc_mod": 0,
        "spell_attack_mod": 0,
        "slots_table": { "1": 2 },
        "description": "Sorts & emplacements de niveau 1"
      }
    },
    {
      "id": "mage_slots_up_to_5",
      "type": "spellcasting_feature",
      "source": "mage",
      "priority": 30,
      "conditions": { "all": [ { "kind": "level_gte", "class": "mage", "value": 5 } ] },
      "payload": {
        "ability": "intelligence",
        "slots_table": { "1": 4, "2": 3, "3": 2 },
        "description": "Mise à jour des emplacements (niv. 5)"
      }
    },
    {
      "id": "mage_cantrips_known",
      "type": "spell_grant",
      "source": "mage",
      "conditions": { "all": [ { "kind": "level_gte", "class": "mage", "value": 1 } ] },
      "payload": {
        "known": true,
        "spells": ["lumiere","mage_main","projectile_magique"]
      }
    }
  ]
}


Remarque : si tu veux donner un sort unique, utilise spell_id (string). Pour plusieurs sorts, tu peux mettre spells: [id,id] (le moteur peut l’accepter si tu as ajouté ce handler; sinon crée plusieurs spell_grant).

2.3 Feature isolée (template)
{
  "id": "tissage_de_sort",
  "nom": "Tissage de sort",
  "description": "Un exemple de feature autonome.",
  "effects": [
    {
      "id": "tissage_de_sort_bonus",
      "type": "casting_modifier",
      "payload": {
        "spell_attack_bonus_delta": 1,
        "spell_save_dc_delta": 0,
        "apply_to": "all",
        "meta": { "display_label": "Tissage de sort (+1 attaque de sort)" }
      }
    }
  ]
}

2.4 Sort (template)
{
  "id": "bouclier",
  "nom": "Bouclier",
  "niveau": 1,
  "ecole": "abjuration",
  "description": "Réaction — +5 CA jusqu'au début de votre prochain tour.",
  "effects": [
    {
      "id": "bouclier_note",
      "type": "ui_message",
      "payload": { "text": "+5 CA (réaction) jusqu'au début de votre prochain tour." }
    }
  ]
}

3) Types d’effets pris en charge (résumé)

stat_modifier → { stat: "strength" | "dexterity" | ... | "all", delta: number, permanent?: boolean }

ability_score_set → { stat: "...", value: number }

proficiency_grant → { proficiency: "perception" | "armures_legères" | ... }

spell_grant → { spell_id?: "bouclier", spells?: ["id1","id2"], known?: bool, prepared?: bool }

spellcasting_feature → { ability: "intelligence" | ..., slots_table: { "1": 2, "2": 3 }, description?: string, spell_save_dc_mod?: number, spell_attack_mod?: number }

casting_modifier → { spell_attack_bonus_delta?: number, spell_save_dc_delta?: number, apply_to?: "all" | "school:evocation" | ... }

grant_feature → { feature_id: "tissage_de_sort" }

sense_grant → { sense_type: "darkvision", range: 18, units: "meters" }

temp_hp_grant → { value: number }

choice → { ui_id?: string, category?: string, choose: number, from: ["id","id"], expertise?: bool, source_label?: string }

legacy_mecanique → { ... } (dernier recours pour stocker une note non appliquée automatiquement)

4) Conditions (exemples)
{ "all": [ { "kind": "level_gte", "class": "mage", "value": 5 } ] }
{ "any": [ { "kind": "class_equals", "class": "mage" }, { "kind": "class_equals", "class": "clerc" } ] }
{ "not":  { "kind": "has_feature", "feature": "armure_lourde" } }

5) Bonnes pratiques d’ID & libellés

id courts, stables, en snake/kebab : humain_bonus_competence, mage_slots_up_to_5.

Toujours remplir source dans les effets (ex: "source": "humain").

ui_id dans choice = identifiant affichable côté UI (stable).

6) Exemples prêts à l’emploi
6.1 Race : Elfe (vision + DEX + compétence)
{
  "id": "elfe",
  "nom": "Elfe",
  "features": [
    {
      "id": "elfe_dex",
      "type": "stat_modifier",
      "source": "elfe",
      "payload": { "stat": "dexterity", "delta": 2, "permanent": true }
    },
    {
      "id": "elfe_darkvision",
      "type": "sense_grant",
      "source": "elfe",
      "payload": { "sense_type": "darkvision", "range": 18, "units": "meters" }
    },
    {
      "id": "elfe_comp_langue",
      "type": "proficiency_grant",
      "source": "elfe",
      "payload": { "proficiency": "perception" }
    }
  ]
}

6.2 Classe : Mage (jusqu’au niveau 5)

(cf. template 2.2 — tu peux reprendre tel quel et ajuster les ids/texte)

7) Checklist de validation (rapide)

 Chaque fichier a id et (si pertinent) nom, description.

 Les races/classes ont features[] (pas mecanique).

 Chaque feature a type + payload cohérent.

 Les choix sont type: "choice" avec choose (number) + from (array d’ids) + (optionnel) ui_id.

 Les sorts utilisent spell_grant (et les sorts eux-mêmes sont dans /spells/<id>.json).

 Les conditions de niveau/classe sont dans conditions.

 Pas de all: 1 dans final_stats attendu — on utilise stat: "all", delta: 1.

8) Tester rapidement (endpoint)
PowerShell
# Construire la requête
$body = @{
  selection = @{
    class = "mage"
    race = "humain"
    niveau = 5
    manual_features = @()
    chosenOptions = @{}   # ajoute ex: @{ humain_bonus_competence = "perception" } pour résoudre
  }
  baseCharacter = @{
    base_stats_before_race = @{
      strength = 8; dexterity = 14; constitution = 12; intelligence = 16; wisdom = 10; charisma = 11
    }
  }
} | ConvertTo-Json -Depth 8

# Envoyer
Invoke-RestMethod -Uri "http://localhost:3000/api/creation/preview" -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 8


Tu dois voir :

pendingChoices avec humain_bonus_competence (si non choisi),

final_stats correctement mises à jour,

spellcasting.slots pour le mage niv. 5,

errors vide (ou traçant des effets non encore gérés).

9) FAQ (rapide)

Q : Je veux une liste déroulante de classes/races dans l’UI
R : ajoute un endpoint (ou utilise l’adapter) qui liste les ids disponibles. Format simple : GET /api/catalog/classes → ["mage","guerrier",...] et GET /api/catalog/races → ["humain","elfe",...].

Q : Comment faire un choix multiple (ex: 2 langues)
R : type: "choice", payload.choose: 2, payload.from: ["langue1","langue2","langue3"].

Q : Donner un sort connu ET préparé ?
R : soit deux effets spell_grant (un known, un prepared), soit un spell_grant avec { known:true, prepared:true } si ton engine supporte la double option.