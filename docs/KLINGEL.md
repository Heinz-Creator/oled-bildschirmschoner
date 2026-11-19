# Haustürklingel und Lautsprecher

Unter **Bildschirmschoner einstellen → Meldungen → Eigene Haustürklingel einrichten** gibt es eine Einrichtung für die eigene Home-Assistant-Installation. Keine privaten Sensoren oder Echo-Gerätenamen sind vorgegeben.

1. **Klingelsensor** aus eigenen Entitäten wählen: `binary_sensor`, `sensor`, `input_boolean` oder `event`.
2. Bei Zustandsentitäten den tatsächlich gemeldeten Klingelzustand eintragen, meist `on`. Bei `event.*` wird jedes Ereignis dieser Entität als Klingeln behandelt; dafür HA 2026.7 oder neuer verwenden. Ein normaler Türkontakt ist kein Klingeldrücker.
3. **Lautsprecher / Assist-Satellit** aus eigenen Geräten wählen.
4. **Ausgabe**: Stumm, Ansage oder Klingelmusik.
5. Bei **Ansage** den Text eintragen. Ein Assist-Satellit verwendet seine in HA konfigurierte Pipeline und Stimme. Für einen normalen Mediaplayer zusätzlich eine TTS-Entität wählen. ElevenLabs ist optional; Piper oder andere HA-TTS-Anbieter sind möglich.
6. Bei **Klingelmusik** einen der vier kurzen Motivklänge oder **Lustige Musik-Fanfare / Comic-Musik** wählen. Die eingetragene HA-Adresse muss vom Lautsprecher erreichbar sein. Bei HACS liegen die Dateien automatisch unter `/local/community/oled-bildschirmschoner/`.
7. **Klingelautomation speichern**. Die Karte legt genau eine eigene Automation an oder aktualisiert diese. Speichern spielt nichts ab. Es wird keine andere Automation überschrieben.

Die Automation läuft zentral in HA, auch wenn kein Display offen ist. Sie nutzt die aktuelle Lautsprecherlautstärke; Medienwiedergabe kann je nach Integration unterbrochen werden. Die Karte verspricht keine universelle Fortsetzung vorheriger Musik. Nicht jeder Mediaplayer kann WAV/URLs wiedergeben; das hängt von der Geräteintegration und erreichbaren HA-Adresse ab.

Die fünf Sekunden Sperrzeit begrenzen mehrfaches Klingeln. Ein Wechsel von unknown/unavailable zum Klingelzustand löst bei Zustandsentitäten keine Ansage aus. Nach dem Speichern erst bei Bedarf bewusst real testen; es gibt keine automatische Hörprobe.

## Bildmeldung und doppelte Ansagen

Die grafische Besuchsmeldung wird separat unter **Eigene Entitäten zuordnen → Besuch an der Tür** an denselben Sensor gebunden. Sie braucht ein geöffnetes Display. Für `event.*` wird die frische Zeitstempeländerung ausgewertet. Kamera-Popups und Telefonanrufe werden von der Karte nicht eingerichtet; vorhandene HA-Automationen können daneben weiterlaufen.

Wenn bereits eine Automation auf dieselbe Klingel eine Ansage abspielt, dort die alte Audioaktion entfernen/deaktivieren oder die neue Ausgabe auf Stumm belassen. Zwei unabhängige Audioautomationen würden zweimal sprechen. Ein FRITZ!Fon-Türruf wird separat in der FRITZ!Box eingestellt, nicht von dieser Karte.

Die Kennung der erzeugten Automation lautet `oled_bildschirmschoner_doorbell`. Sie ist unter **Einstellungen → Automationen & Szenen** frei bearbeitbar und deaktivierbar. Zum Entfernen ausschließlich diese Automation löschen. Manuelle Änderungen können beim nächsten Speichern aus der Karte ersetzt werden; vorher kopieren, wenn sie erhalten bleiben sollen.

Die ältere helperbasierte Haustürsteuerung wird nur angezeigt, wenn die entsprechenden Helfer bereits existieren. Sie ist eine Kompatibilitätsfunktion für Bestandsinstallationen und für eine Neuinstallation nicht erforderlich.

Audioquellen und Lizenzen: [AUDIO-LICENSES.txt](../dist/AUDIO-LICENSES.txt).
