export const PLAYLISTS = {
  spring: { query: "Frühlingsmusik", command: "Spiele Frühlingsmusik" },
  summer: { query: "Sommerhits", command: "Spiele Sommerhits" },
  autumn: {
    query: "Entspannte Herbstmusik",
    command: "Spiele entspannte Herbstmusik",
  },
  winter: {
    query: "Gemütliche Wintermusik",
    command: "Spiele gemütliche Wintermusik",
  },
  easter: { query: "Ostermusik", command: "Spiele Ostermusik" },
  may: { query: "Frühlingshits", command: "Spiele Frühlingshits" },
  mothers: {
    query: "Lieblingslieder zum Muttertag",
    command: "Spiele Musik zum Muttertag",
  },
  fathers: { query: "Rock Klassiker", command: "Spiele Rock Klassiker" },
  halloween: { query: "Halloween Party", command: "Spiele Halloween Musik" },
  nicholas: { query: "Weihnachtsmusik", command: "Spiele Weihnachtsmusik" },
  christmas: { query: "Weihnachtsmusik", command: "Spiele Weihnachtsmusik" },
  christmas_eve: {
    query: "Weihnachtsklassiker",
    command: "Spiele Weihnachtsmusik",
  },
  newyear: { query: "Silvester Party", command: "Spiele Silvester Partymusik" },
  birthday: { query: "Geburtstagsmusik", command: "Spiele Geburtstagsmusik" },
};
export function playlistKey(season, occasion) {
  return Object.hasOwn(PLAYLISTS, occasion) ? occasion : season;
}
export function youtubePlaylist(value) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    ![
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
    ].includes(url.hostname)
  ) {
    throw new Error("Bitte einen YouTube-Playlist-Link eingeben.");
  }
  const id = url.searchParams.get("list");
  if (!id || !/^[A-Za-z0-9_-]{8,160}$/.test(id))
    throw new Error("Im Link fehlt eine gültige Playlist-ID.");
  return { id, url: "https://www.youtube.com/playlist?list=" + id };
}
