# Freiburger Krimi 1

Einfache geschuetzte Manuskript-Webseite fuer `Tod zwischen Kräutern`.

## Start

```bash
npm start
```

Danach im Browser oeffnen:

```text
http://localhost:3000
```

Der Standardcode ist:

```text
1462
```

Optional kann der Code beim Start ueberschrieben werden:

```bash
ACCESS_CODE=1462 npm start
```

## Schutzmodell

Das Manuskript wird nicht in der initialen HTML-, CSS- oder JS-Auslieferung
eingebettet. Die Datei `Freiburg Klara Faller/MANUSCRIPT.md` wird erst durch
die Server-API nach korrekter Codeeingabe geladen.

Wichtig: Wenn dieses Repository oeffentlich auf GitHub liegt, ist die
Manuskriptdatei dort trotzdem sichtbar. Fuer echte Nicht-Oeffentlichkeit muss
das Repository privat bleiben oder das Manuskript aus einem privaten Speicher
bezogen werden.
