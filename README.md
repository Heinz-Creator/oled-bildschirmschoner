# OLED Bildschirmschoner für Home Assistant

Ein Bildschirmschoner fürs Wandtablet. Er zeigt Uhrzeit, Wetter und den aktuellen Hausstatus vor einer von drei Motivwelten. Baum & Jahreszeiten, Minecraft-Welt und Lichtküste enthalten zusammen 84 Tag-, Nacht-, Saison- und Feiertagsmotive. Eigene Fotos lassen sich im Einstellungsdialog ergänzen.

![Bildschirmschoner auf einem Wandtablet mit Beispieldaten](preview.jpg)

## Installation über HACS

Sobald dieses Repository öffentlich ist, öffne **HACS → Drei-Punkte-Menü → Benutzerdefinierte Repositories**. Füge `https://github.com/Heinz-Creator/oled-bildschirmschoner` mit der Kategorie **Dashboard** hinzu und lade **OLED Bildschirmschoner** herunter. Lade anschließend Home Assistant im Browser neu. [HACS-Dokumentation](https://www.hacs.xyz/docs/faq/custom_repositories/)

## Manuelle Installation

1. Lade das GitHub-Archiv herunter und entpacke es.
2. Kopiere **den gesamten Inhalt von `dist/`** in den Ordner `www/oled-bildschirmschoner/` deiner Home-Assistant-Konfiguration. Falls du den Ordner `www` neu anlegst, starte Home Assistant einmal neu.
3. Füge unter **Einstellungen → Dashboards → Ressourcen** die URL `/local/oled-bildschirmschoner/oled-bildschirmschoner.js` als **JavaScript-Modul** hinzu und lade das Dashboard neu. [Ressourcen registrieren](https://contributors.home-assistant.io/frontend/custom-ui/resources/)

## Auf dem Tablet einrichten

Füge die Karte **OLED Bildschirmschoner** auf dem Dashboard hinzu, das auf dem Wandtablet geöffnet bleibt. **Jetzt ansehen** öffnet die Vorschau. Unter **Bildschirmschoner einstellen** wählst du eine Motivwelt und aktivierst **Auf diesem Display automatisch starten**. Die Ruhezeit wird für diesen Browser gespeichert. Tippen oder Escape schließt den Bildschirmschoner. Das Tablet muss das Dashboard geöffnet und das Display eingeschaltet haben.

Licht, Rollos, Wiedergabe und Wetter werden nach Möglichkeit automatisch aus Home Assistant übernommen. Im Karteneditor kannst du die Auswahl einschränken oder weitere Quellen zuordnen. Für Rollos berücksichtigt die automatische Auswahl die Geräteklassen Rollo, Jalousie, Vorhang und Beschattung. Medientitel erscheinen, wenn die Geräteintegration einen Titel oder Sender liefert.

Für **Waschmaschine fertig** legst du unter **Gerätemeldungen** eine Regel an. Wähle einen Sensor oder Helfer und gib seinen tatsächlichen Fertigzustand ein. Die Meldung bleibt sichtbar, solange dieser Zustand gilt. Zum Beispiel kann ein vorhandener Helfer nach einem abgeschlossenen Lauf auf `on` wechseln und beim nächsten Start wieder zurückgesetzt werden. [Beispiel zur Erkennung per Strommessung](https://www.home-assistant.io/integrations/template/#state-based-binary-sensor---washing-machine-running)

Optional kannst du Hausverbrauch, PV-Leistung, gefühlte Temperatur, Kalender und eine Nachrichten-Entität wählen. Die Nachrichtenquelle ist ein Sensor, der den Titel als Zustand oder im Attribut `title` liefert. Kalenderdaten kommen aus dem gewählten Home-Assistant-Kalender. Eigene Fotos werden im Home Assistant des jeweiligen Nutzers gespeichert. Die Karte zeigt Zustände an und steuert keine Geräte.

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

GitHub Actions prüft die HACS-Struktur, sobald das Repository öffentlich ist. Nach einem grünen Lauf ein GitHub-Release erstellen. Für die Aufnahme in die normale HACS-Suche muss der Repo-Eintrag anschließend in `hacs/default` unter `plugin` eingereicht und angenommen werden. [HACS-Aufnahme](https://www.hacs.xyz/docs/publish/include/)

Die mitgelieferten Motivwelten sind eigens für das Projekt erstellte Illustrationen. Minecraft-Welt ist ein inoffizielles Motiv im Blockstil.
