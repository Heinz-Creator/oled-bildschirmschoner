# Freigabeprüfung · 19. November 2026

Geprüft wurde das eigenständige öffentliche Paket, getrennt vom privaten OLED-Zuhause-Projekt. Keine Tonwiedergabe, keine echte Klingelauslösung und kein Telefonanruf während der Prüfung.

## Automatisiert

28 Tests erfolgreich. Abgedeckt sind unter anderem:

- Besucherpriorität, Rotation mehrerer Ereignisse, Anzeigedauern und Müllwiederholung.
- Persistente Quittierung, nächster Gerätezyklus und Entitätsbindung.
- Frische `event.*`-Klingelereignisse gegenüber alten Zeitstempeln.
- Lichtgruppen ohne Doppelzählung, Rollos ohne Garagentore, fehlende/offline Werte und Temperatureinheiten.
- Wasch-/Spülmaschinenstatus nur bei passender Quelle; Wiederverwendung eines bereits angelegten Helfers nach fehlgeschlagenem Automationsspeichern.
- Kameraführung und vollständige Szene in Quer- und Hochformat, auch bei 390×844 und 768×1024.
- Vorschauübergabe aller fünf Testereignisse und sofortiger Besuchsvorrang.
- Klingeleinrichtung: Validierung, Schreiben, Rücklesen; kein Service-/Audiobefehl beim Speichern, kein Überschreiben einer fremden Automation und Stumm ohne Audioaktion.
- Google: zulässige Foto-/Auswahldomains, HTTPS-Anforderungen und abbrechbare Wartezeiten.
- JavaScript-Syntax des eingebetteten Dokuments und öffentliche Motivgrenzen.

Die Tests wurden auch aus einer eigenen Kopie des öffentlichen Repositorys ohne Import in das private OLED-Zuhause-Projekt ausgeführt. Build aus Paketabhängigkeiten geprüft. `npm audit` meldete bei der Installation keine bekannten Schwachstellen (Zeitpunkt der Prüfung; kein allgemeines Sicherheitsversprechen).

## Im Browser

Öffentliche Testinstallation mit Beispieldaten und gesperrten Geräte-/Audiobefehlen:

- Anzeige, Meldungen, Musik und Fotoalben geöffnet.
- Eigener Klingelsensor, eigener Satellit und Klang gewählt; Speichern und Rücklesen in isolierter Testkonfiguration ohne Serviceaufruf erfolgreich.
- Zwei lokale WebP-Fotos in ein Album importiert.
- Google-OAuth mit einem eigens eingerichteten Web-Client und Testnutzer tatsächlich durchlaufen. Fotoauswahlsitzung erstellt, vom Nutzer ausgewählte Bilder heruntergeladen und lokal gespeichert. Zwei Auswahlen mit 10 beziehungsweise 6 Fotos wurden bestätigt. Diashowbild danach technisch mit geladenen natürlichen Bildabmessungen geprüft; private Fotos weder aufgezeichnet noch veröffentlicht.
- Bei diesem Live-Test wurden der Google-Fehler „origin null“ durch einen eigenen Anmeldedialog sowie alte Anmeldetimer korrigiert.
- Assistenteneinstellungen nach Menüumbau wiederhergestellt und Figurwahl ohne Audio geprüft.
- Klassischer Baum live ohne allgemeine Sackkarrenfigur und mit getrennten Licht-/Rollotexten geprüft.
- Animierte Wald-, Küsten-, Block- und Bahnwelt mit unterschiedlichen Ereignissen sichtbar geprüft und als kurze Originalaufnahmen für den Rundgang aufgenommen.

## Paket und Datenschutz

Keine privaten Hausgeräte, Tailscale-Adresse, Telefonnummer, Google-Client-ID, Google-Secret, Zugriffstoken oder privaten Google-Fotos im Veröffentlichungspaket. Der öffentliche Build enthält die vier freigegebenen Welten; private Haus-/Teddy-Erweiterungen werden nicht als öffentliche Motive angeboten. Schriftarten sind im Build eingebettet; die normale Anzeige lädt keine Google-Fonts-Schriftdateien nach.

HACS-Struktur: passender Modulname unter `dist/`, vollständige Bild-/Audio-/Anmeldedialogdateien, Manifest und ausführliche README. Musik-Jingles mit CC0-Quellen dokumentiert; Schriftlizenzen beigelegt.

## Bewusst nicht behauptet

- Kein Hörtest: tatsächliche Lautsprecherwiedergabe, Lautstärke und externe TTS-/Musikdienste wurden auf ausdrücklichen Wunsch nicht abgespielt. Die entsprechenden Aktionsfelder wurden mit der vorhandenen HA-Servicebeschreibung verglichen. Geräte- und Anbieterkompatibilität hängt von der jeweiligen Installation ab.
- Kein echter Haustürklingel-/Telefon-/Kameratest.
- Keine Veröffentlichung privater Konten oder Google-Bilder im Demo-Video.
- Keine Behauptung einer weltweit identischen Feiertagslogik, einer universellen Dauer-Zuhörfunktion oder einer laufenden Google-Album-Synchronisation.
- Kein vollständiger End-to-End-Test jeder denkbaren HA-Version, jedes Browsers und jedes Lautsprechers.

Die zusätzlichen Videoaufnahmen sind Funktionsvorschauen mit Beispieldaten. Die Anleitung trennt zentrale HA-Automationen von lokalen Displayeinstellungen und erklärt diese Grenzen.
