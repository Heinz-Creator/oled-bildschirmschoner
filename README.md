# OLED Bildschirmschoner für Home Assistant

Ein Bildschirmschoner fürs Wandtablet. Er zeigt Uhrzeit, Wetter und den aktuellen Hausstatus vor einer von drei Motivwelten. Baum & Jahreszeiten, Minecraft-Welt und Lichtküste enthalten zusammen 84 Tag-, Nacht-, Saison- und Feiertagsmotive. Eigene Fotos lassen sich im Einstellungsdialog ergänzen.

![Bildschirmschoner auf einem Wandtablet mit Beispieldaten](preview.jpg)

[Bildschirmschoner im Einsatz – YouTube-Short ansehen](https://www.youtube.com/shorts/OaAi-cG6acw)

## Installation über Marketplace oder HACS

[![In HACS öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Heinz-Creator&repository=oled-bildschirmschoner&category=plugin)

1. Öffne **Einstellungen → Marketplace → Über Link hinzufügen** und füge `https://github.com/Heinz-Creator/oled-bildschirmschoner` ein. Verbinde bei Bedarf dein GitHub-Konto. Wenn du HACS verwendest, öffne den Button oben oder füge den Link in **Benutzerdefinierte Repositorys** als **Dashboard** hinzu.
2. Wähle **Installieren** im Marketplace oder **Herunterladen** in HACS. Beide laden das Modul und die mitgelieferten Motive. Bei Dashboard-Ressourcen im YAML-Modus übernimm die Modul-URL aus dem Installationsdialog.
3. Lade Home Assistant im Browser neu und füge die Karte **OLED Bildschirmschoner** zu deinem Tablet-Dashboard hinzu.
4. Öffne am Wandtablet **Bildschirmschoner einstellen** und aktiviere **Auf diesem Display automatisch starten**.

[Marketplace-Dokumentation](https://contributors.home-assistant.io/marketplace/guides/dashboard/) · [HACS-Dokumentation](https://www.hacs.dev/docs/faq/custom_repositories/)

## Manuelle Installation

1. Lade das GitHub-Archiv herunter und entpacke es.
2. Kopiere **den gesamten Inhalt von `dist/`** in den Ordner `www/oled-bildschirmschoner/` deiner Home-Assistant-Konfiguration. Falls du den Ordner `www` neu anlegst, starte Home Assistant einmal neu.
3. Füge unter **Einstellungen → Dashboards → Ressourcen** die URL `/local/oled-bildschirmschoner/oled-bildschirmschoner.js` als **JavaScript-Modul** hinzu und lade das Dashboard neu. [Ressourcen registrieren](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

## Auf dem Tablet einrichten

Füge **OLED Bildschirmschoner** auf der Dashboard-Seite hinzu, die auf dem Wandtablet geöffnet bleibt. Die Karte ist im Bearbeitungsmodus sichtbar und läuft im normalen Dashboard im Hintergrund. Öffne am Tablet **Dashboard bearbeiten → OLED Bildschirmschoner → Bearbeiten → Bildschirmschoner einstellen**. Wähle eine Motivwelt und aktiviere **Auf diesem Display automatisch starten**. Die Ruhezeit wird für diesen Browser gespeichert. Wenn du die Schaltfläche **Jetzt ansehen** im normalen Dashboard möchtest, aktiviere im Karteneditor **Karte im Dashboard anzeigen**. Tippen oder Escape schließt den Bildschirmschoner. Das Tablet muss das Dashboard geöffnet und das Display eingeschaltet haben.

Licht, Rollos, Wiedergabe und Wetter werden nach Möglichkeit automatisch aus Home Assistant übernommen. Im Karteneditor kannst du die Auswahl einschränken oder weitere Quellen zuordnen. Für Rollos berücksichtigt die automatische Auswahl die Geräteklassen Rollo, Jalousie, Vorhang und Beschattung. Medientitel erscheinen, wenn die Geräteintegration einen Titel oder Sender liefert.

Optional kannst du Hausverbrauch, PV-Leistung, gefühlte Temperatur, Kalender und eine Nachrichten-Entität wählen. Die Nachrichtenquelle ist ein Sensor, der den Titel als Zustand oder im Attribut `title` liefert. Kalenderdaten kommen aus dem gewählten Home-Assistant-Kalender. Eigene Fotos werden im Home Assistant des jeweiligen Nutzers gespeichert. Die Karte zeigt Zustände an und steuert keine Geräte.

## Figuren und Sprachassistenten

Öffne **Bildschirmschoner einstellen → Assistent** und aktiviere **Assistent aktiv**. Wähle Edgar, Berta Berlin oder Haunting-Hector. Im Bildschirmschoner öffnet das leuchtende Symbol die Figur mit Chat und der Taste **Zuhören**.

- Wähle für jede Figur unter **Sprachassistent für …** einen Assist-Assistenten deiner eigenen Home-Assistant-Installation. Home Assistant verwendet dessen konfigurierte Stimme. Die Zuordnung gilt für dieses Display.
- Bei **Home-Assistant-Standard** oder wenn eine gespeicherte Zuordnung wegfällt, gilt der bevorzugte Assist-Assistent. Mit nur einem eingerichteten Assistenten verwenden alle Figuren dieselbe Stimme.
- Richte Assist unter **Einstellungen → Sprachassistenten** ein. Für Mikrofoneingaben braucht der Browser in der Regel HTTPS und Mikrofonzugriff. Ohne Sprachausgabe bleiben Antworten im Chat sichtbar.
- **MP3-Hörprobe abspielen** spielt die kurze, mit eSpeak NG erzeugte Begrüßung der gewählten Figur ab. Die drei Hörproben sind im Paket enthalten. Neue Antworten erzeugt Home Assistant mit dem gewählten Assist-Assistenten.
- Der Chat zeigt Überschriften, Absätze und Listen formatiert. Aktiviere **Rezeptfotos von Wikimedia Commons** für Fotos zu unterstützten Gerichten wie Käsekuchen, Apfelstrudel oder Lasagne. Die Suche sendet nur den Gerichtsnamen, etwa „Käsekuchen“, an Wikimedia. Bei einem Treffer erscheinen Foto, Urheber und Lizenz im Chat. Das Rezept ist sofort lesbar.

## Feiertage und eigene Fotos

Der Bildschirmschoner wählt passende Motive nach Datum und Ortszeit in Home Assistant. So wechselt die gewählte Motivwelt etwa ab dem ersten Advent, rund um Ostern oder zu Silvester. Im Einstellungsdialog kannst du einzelne Anlässe ausschalten. Im gemischten Modus wechseln sich eigene Fotos und automatische Motive ab. Im Fotomodus erscheint dein Album, sobald es Bilder enthält.

| Advent & Weihnachten | Ostern | Silvester & Neujahr |
| --- | --- | --- |
| ![Weihnachtsmotiv aus Baum & Jahreszeiten](dist/christmas-evening.webp) | ![Ostermotiv aus der Minecraft-Welt](dist/minecraft-easter-morning.webp) | ![Silvestermotiv aus der Lichtküste](dist/coast-newyear-evening.webp) |

## Waschmaschine oder Geschirrspüler fertig

**Gerät liefert einen Status.** Bei Bosch mit Home Connect oder Samsung mit SmartThings kann Home Assistant je nach Modell den Programmstatus lesen. Schau unter **Entwicklerwerkzeuge → Zustände** nach, welchen Zustand dein Gerät nach einem fertigen Programm meldet. Wähle im Karteneditor unter **Gerätemeldungen** diese Entität, trage den beobachteten Zustand und einen Anzeigetext wie „Geschirrspüler fertig“ ein. [Home Connect](https://www.home-assistant.io/integrations/home_connect/) · [SmartThings](https://www.home-assistant.io/integrations/smartthings/)

**Gerät ohne Programmstatus.** Eine für das Gerät geeignete Steckdose mit Leistungsmessung kann den Programmablauf erkennen. Die Automation liest nur den Sensor in **Watt** und ändert einen Status-Helfer.

1. Öffne im Karteneditor **Gerätemeldungen → Waschmaschine oder Geschirrspüler über Steckdose einrichten**. Wähle das Gerät und den Leistungssensor der Steckdose in Watt.
2. Prüfe bei Bedarf **Schwellen und Wartezeiten**. Voreinstellung für die Waschmaschine ist über 25 W für 2 Minuten beim Start und unter 15 W für 15 Minuten beim Ende. Beim Geschirrspüler sind es über 10 W für 1 Minute und unter 5 W für 10 Minuten. Passe die Wartezeiten an die Programmpausen deines Geräts an.
3. Klicke als Home-Assistant-Administrator auf **Automation hinzufügen** und speichere die Karte. Die Karte legt den Status-Helfer und die Automation an und trägt die Fertigmeldung ein.

Der Helfer hat die Zustände `Bereit`, `Läuft` und `Fertig`. Für eine Durchsage oder andere Folgeaktion kannst du in einer eigenen Automation den Wechsel auf `Fertig` als Auslöser verwenden. Die Entität steht nach der Einrichtung im Karteneditor. Ein Neustart unterbricht laufende Wartezeiten.

### Manuell über den Blueprint

1. Lege unter **Einstellungen → Geräte & Dienste → Helfer** einen **Auswahl-Helfer** mit den Optionen `Bereit`, `Läuft` und `Fertig` an. Lege pro Gerät einen eigenen Helfer an.
2. Importiere den Blueprint und erstelle daraus eine Automation. Wähle den Leistungssensor und den Status-Helfer aus. [Automation als Blueprint öffnen](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2FHeinz-Creator%2Foled-bildschirmschoner%2Fblob%2Fmain%2Fblueprints%2Fgeraet-fertig.yaml)
3. Im Karteneditor unter **Gerätemeldungen** den Helfer auswählen und als Zustand `Fertig` eintragen. Gib der Anzeige einen Namen wie „Waschmaschine fertig“.

Die Beispielwerte liegen bei über 15 W für zwei Minuten für den Start und unter 3 W für zehn Minuten für das Ende. Passe sie nach einem beobachteten Lauf an dein Gerät an. Die Meldung erscheint erst nach einem erkannten Lauf und wechselt beim nächsten erkannten Start zurück. Ein Neustart unterbricht laufende Wartezeiten. Die Auswertung setzt beim nächsten Schwellenwechsel wieder ein. [Blueprint-Datei](blueprints/geraet-fertig.yaml) · [Home-Assistant-Auslöser](https://www.home-assistant.io/triggers/numeric_state/)

### YAML-Beispiel

Ersetze die Entitätsnamen durch deine eigenen. Alle Einstellungen unterhalb von `type` sind optional.

```yaml
type: custom:oled-bildschirmschoner
lights:
  - light.kueche
  - light.wohnzimmer
covers:
  - cover.rollo_kueche
players:
  - media_player.fernseher
weather: weather.zuhause
house_power: sensor.hausverbrauch
solar_power: sensor.pv_leistung
calendar: calendar.familie
appliances:
  - entity: binary_sensor.waschmaschine_fertig
    state: "on"
    title: Waschmaschine fertig
    detail: Wäsche kann raus
```

## Entwicklung und Veröffentlichung

```sh
npm ci
npm test
npm run build
```

Für neue Motive ergänze die WebP-Dateien in `dist/`. Neue Feiertage brauchen außerdem einen Kalendereintrag in `src/ambient-calendar.js` und für jede Motivwelt eine Morgen- und eine Abenddatei. Ersetzte Bilder können ihre bisherigen Dateinamen behalten.

Führe danach die Tests und den Build aus. Veröffentliche für ein Update einen neuen GitHub-Release mit einer höheren Versionsnummer. Der Tag muss das vollständige `dist/` mit JavaScript und Motiven enthalten. HACS und der Marketplace beziehen das Paket aus dem getaggten Stand. Wenn du Dateien als Release-Assets anhängst, hänge das Modul und alle benötigten Bilder gemeinsam an. [Marketplace-Dokumentation zur Paketstruktur](https://contributors.home-assistant.io/marketplace/guides/dashboard/#name-your-file-after-your-repository)

Die mitgelieferten Motivwelten sind eigens für das Projekt erstellte Illustrationen. Minecraft-Welt ist ein inoffizielles Motiv im Blockstil.
