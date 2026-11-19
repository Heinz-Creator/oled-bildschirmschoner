# Google Fotos einrichten

Zwei Wege sind vorgesehen: lokale Albumimporte ohne Google-Anmeldung und die optionale direkte Auswahl mit Google Photos Picker. Es gibt keine Anmeldung über einen zentralen Server des Kartenautors.

## Ohne API: Google Takeout

1. Unter https://takeout.google.com/ nur Google Fotos und die gewünschten Alben exportieren.
2. Das ZIP herunterladen. Im Bildschirmschoner **Einstellungen → Fotoalben → Album-ZIP** wählen. Alternativ das ZIP entpacken und den Albumordner auswählen.
3. Alben aktivieren. Unter **Anzeige** die Bildauswahl auf eigene Fotoalben oder Motivwelt & Fotos stellen; Reihenfolge und Wechselintervall wählen.

JPEG, PNG, WebP, GIF, AVIF und BMP werden anhand ihrer Dateiendung importiert. HEIC/HEIF und Videos werden nicht unterstützt; vorher in JPEG umwandeln. Importgrenzen: 1000 Bilder und 250 MB pro Import; bei ZIP zusätzlich höchstens 25 MB pro Bild. Die tatsächliche Grenze kann durch den freien Browserspeicher kleiner sein.

## Direkte Fotoauswahl mit Google Photos Picker

Voraussetzungen: Google-Konto, eigenes Google-Cloud-Projekt, aktivierte **Google Photos Picker API**, OAuth-Client vom Typ **Webanwendung** und ein von Google zugelassener JavaScript-Ursprung. Für Home Assistant ist das normalerweise eine HTTPS-Adresse. Die lokale HTTP-Adresse oder eine private IP wird von Google nicht als normaler Web-Ursprung akzeptiert. Für Entwicklung erlaubt Google localhost; die Client-ID muss exakt denselben Ursprung einschließlich Port enthalten.

1. In https://console.cloud.google.com/ ein Projekt erstellen und auswählen.
2. **APIs und Dienste → Bibliothek → Google Photos Picker API → Aktivieren**.
3. Unter **Google Auth Platform** den Zustimmungsbildschirm einrichten: App-Name, Supportkontakt, Zielgruppe **Extern** bei einem privaten Google-Konto; zunächst Testmodus und das eigene Konto als Testnutzer.
4. Benötigter Bereich: `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Keine Drive- oder Schreibrechte nötig.
5. Unter **Clients** eine **Webanwendung** anlegen. Bei **Autorisierte JavaScript-Quellen** den Ursprung der HA-Seite eintragen, zum Beispiel `https://ha.example.org`, ohne Dashboardpfad und ohne abschließenden Schrägstrich. Die Karte zeigt den aktuellen Ursprung unter Fotoalben an. Ein Client-Secret wird in der Karte nicht verwendet.
6. Die Client-ID mit Endung `.apps.googleusercontent.com` in **Fotoalben → Google Fotos direkt auswählen** eintragen. **Fotos bei Google auswählen** klicken. Im separaten Dialog **Bei Google anmelden** drücken; dieser Dialog hat einen echten Ursprung und vermeidet Googles Fehler „origin null“ im eingebetteten Einstellfenster.
7. Selbst bei Google anmelden und die angefragte Freigabe prüfen. Danach den Link **Fotoauswahl bei Google öffnen** in den Fotoalben-Einstellungen verwenden, gewünschte Bilder markieren und bei Google **Fertig** drücken. Falls das Auswahlfenster blockiert wird, den angebotenen Link öffnen.
8. Die Karte übernimmt ausschließlich die ausgewählten Fotos in das lokale Album. Danach Bildauswahl und Intervall einstellen.

Das ist ein einmaliger Import ausgewählter Bilder, keine fortlaufende Synchronisation eines privaten Google-Albums. Neue Fotos erneut auswählen/importieren. Die Google-Zugriffstoken bleiben nur im Arbeitsspeicher und werden nicht in der Kartenkonfiguration gespeichert. Fotos liegen im Browserspeicher dieses Geräts und HA-Benutzers; nicht automatisch auf anderen Displays. Browserdaten löschen entfernt diese lokalen Alben. Originale behalten.

## Fehler verstehen

- **origin_mismatch**: Exakter Ursprung passt nicht zur OAuth-Client-ID (https/http, Domain oder Port).
- **access_denied / App im Testmodus**: eigenes Konto als Testnutzer hinterlegen, Freigabe selbst prüfen.
- **Popup blockiert/geschlossen**: Pop-ups für diese HA-Seite erlauben und nochmals wählen.
- **Foto konnte nicht geladen werden**: API-Zugriff, Google-Session, Browser-CORS oder Netzwerk prüfen. Google Takeout bleibt der Weg ohne direkte API-Verbindung.
- **Speicher voll**: kleinere Alben importieren; Browserspeicher ist kein Foto-Backup.

Google kann seine Oberfläche und API-Bedingungen ändern. Die Live-Prüfung mit einem realen Konto ist im Prüfbericht getrennt von automatisierten Tests dokumentiert.

Quellen: https://developers.google.com/photos/picker/guides/get-started-picker · https://developers.google.com/identity/oauth2/web/guides/use-token-model

Die nicht geheime OAuth-Client-ID wird lokal für diesen Browser/HA-Benutzer gemerkt. Client-Secret und Zugriffstoken werden dort nicht gespeichert.
