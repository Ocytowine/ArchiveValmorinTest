Type de propriété :

Items :

  "id": 
  "name": 
  "type": texte minuscule. arme / armure / munition / bouclier / vêtement / bourse / grimoire / accéssoire
  "description": texte. description visuel (peut être définie par joueur au début /création)
  "lore": texte. histoire de l'item, ou à t'il était aquis...
  "equiped": équipable (true ou false) (a voir la logique du slot équipable en fonction du type)
  "allow_stack": est ce que l'item est empilable
  "harmonisable": true ou false. peut on l'harmonisé (donner la feature si c'est true)
  "focalisateur": false, ou arcanique, druidique, sacre. peut il etre le focalisateur pour lanceur de sort
  "weight": valeur en kilo. poids de l'item en kilo
  "value": { valeur en argent
    "gold": 20,
    "silver": 0,
    "copper": 0
  },
  "effects": décrires les effets " mécanique " voir Création de données pour exemple

effects : chaque type d'effet à un Payload 

