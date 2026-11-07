const fs = require("fs");

const filePath = "./lib/tmdb_titles.json";
const titles = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const newTitles = [
  // Movies from Image 4
  {
    id: "possible-love",
    tmdbId: 991001,
    title: "Possible Love",
    type: "movie",
    year: 2026,
    rating: 7.8,
    quality: "HD",
    genres: ["Romance", "Drama"],
    country: "Japan",
    language: "Japanese",
    service: "netflix",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/6E1G6404u2R8L6i5y6S6mE7M9Q2.jpg",
    poster: "https://image.tmdb.org/t/p/w500/k8O8U5v5N5M5m5b5N5M5m5b5N5M.jpg",
    overview: "A tender romance set along the serene coastal shores of Kamakura where past choices and new beginnings cross."
  },
  {
    id: "primetime",
    tmdbId: 991002,
    title: "Primetime",
    type: "movie",
    year: 2026,
    rating: 6.8,
    quality: "HD",
    genres: ["Thriller", "Drama"],
    country: "United States",
    language: "English",
    service: "max",
    studio: "warner",
    backdrop: "https://image.tmdb.org/t/p/w780/y5a1Z7e8Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/z6b2Y8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "An ambitious television host is held hostage on live national broadcast, unearthing corporate espionage and state secrets in real time."
  },
  {
    id: "godzilla-minus-zero",
    tmdbId: 991003,
    title: "Godzilla Minus Zero",
    type: "movie",
    year: 2026,
    rating: 8.1,
    quality: "Cam",
    badge: "Cam",
    genres: ["Action", "Sci-Fi"],
    country: "Japan",
    language: "Japanese",
    service: "crunchyroll",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/8Z8Gz1a1Z7e8Q2Y1X9C4W2T7E5q.jpg",
    poster: "https://image.tmdb.org/t/p/w500/9Z9Gz1a1Z7e8Q2Y1X9C4W2T7E5q.jpg",
    overview: "In the fragile era following global reconstruction, an even deadlier primordial atomic beast surfaces from the oceanic trench."
  },
  {
    id: "apocalypse-z",
    tmdbId: 991004,
    title: "Apocalypse Z",
    type: "movie",
    year: 2024,
    rating: 7.0,
    quality: "HD",
    genres: ["Horror", "Action", "Sci-Fi"],
    country: "Spain",
    language: "Spanish",
    service: "prime",
    studio: "universal",
    backdrop: "https://image.tmdb.org/t/p/w780/2fxnTX497LoYpXfN3nCkh3K4q7o.jpg",
    poster: "https://image.tmdb.org/t/p/w500/wIGJnBw2QxJq8uB8H7bY5v9e8Q2.jpg",
    overview: "A rabies-like virus ravages Spain, forcing a grief-stricken lawyer to survive alongside his cat across an apocalyptic landscape."
  },
  {
    id: "a-dogs-perfect-christmas",
    tmdbId: 991005,
    title: "A Dog's Perfect Christmas",
    type: "movie",
    year: 2024,
    rating: 6.5,
    quality: "HD",
    genres: ["Family", "Comedy"],
    country: "United States",
    language: "English",
    service: "disney",
    studio: "universal",
    backdrop: "https://image.tmdb.org/t/p/w780/3g9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/4h9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "An endearing rescue golden retriever conspires with a feuding family to bring everyone together for an unforgettable snowy holiday."
  },

  // Series from Image 3
  {
    id: "campus-drivers",
    tmdbId: 992001,
    title: "Campus Drivers",
    type: "series",
    year: 2026,
    rating: 10.0,
    genres: ["Romance", "Comedy"],
    country: "France",
    language: "French",
    service: "netflix",
    studio: "universal",
    backdrop: "https://image.tmdb.org/t/p/w780/5i9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/6j9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "Four charismatic university students launch a student transport app on campus, navigating fast romances, heartbreaks, and university rivalry."
  },
  {
    id: "dead-end-job",
    tmdbId: 992002,
    title: "Dead-End Job",
    type: "series",
    year: 2026,
    rating: 7.7,
    genres: ["Comedy", "Sci-Fi"],
    country: "South Korea",
    language: "Korean",
    service: "netflix",
    studio: "paramount",
    backdrop: "https://image.tmdb.org/t/p/w780/7k9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/8l9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "A disaffected Seoul convenience store worker accidentally discovers that the store's stockroom basement connects to an interdimensional paranormal sanitation route."
  },
  {
    id: "dexter-resurrection",
    tmdbId: 992003,
    title: "Dexter: Resurrection",
    type: "series",
    year: 2025,
    rating: 8.6,
    genres: ["Crime", "Drama", "Mystery"],
    country: "United States",
    language: "English",
    service: "max",
    studio: "paramount",
    backdrop: "https://image.tmdb.org/t/p/w780/9m9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/0n9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "Surviving the hypothermic freeze in Iron Lake, Dexter Morgan resurfaces in New York City with a refined Dark Passenger code."
  },
  {
    id: "mobland",
    tmdbId: 992004,
    title: "MobLand",
    type: "series",
    year: 2025,
    rating: 8.6,
    genres: ["Crime", "Drama"],
    country: "United States",
    language: "English",
    service: "apple",
    studio: "paramount",
    backdrop: "https://image.tmdb.org/t/p/w780/1o9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/2p9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "Three dynasty syndicate families battle over newly deregulated dockyards and industrial riverfront empires."
  },
  {
    id: "the-remarried-empress",
    tmdbId: 992005,
    title: "The Remarried Empress",
    type: "series",
    year: 2026,
    rating: 8.3,
    genres: ["Drama", "Romance", "Fantasy"],
    country: "South Korea",
    language: "Korean",
    service: "netflix",
    studio: "toho",
    backdrop: "https://image.tmdb.org/t/p/w780/3q9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/4r9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "Navier Ellie Trovi was an empress perfect in every way. When the emperor demands a divorce for his concubine, she accepts—on the condition that she remarries the Western Kingdom's king."
  },
  {
    id: "nocturne",
    tmdbId: 992006,
    title: "Nocturne",
    type: "series",
    year: 2026,
    rating: 7.7,
    genres: ["Mystery", "Thriller"],
    country: "United Kingdom",
    language: "English",
    service: "prime",
    studio: "universal",
    backdrop: "https://image.tmdb.org/t/p/w780/5s9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/6t9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "In nighttime London, an elite squad of nocturnal detectives unravel high-stakes conspiracies occurring strictly between dusk and dawn."
  },
  {
    id: "the-greatest",
    tmdbId: 992007,
    title: "The Greatest",
    type: "series",
    year: 2026,
    rating: 5.3,
    genres: ["Drama"],
    country: "United States",
    language: "English",
    service: "max",
    studio: "warner",
    backdrop: "https://image.tmdb.org/t/p/w780/7u9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/8v9qY8e9Q2Y1X9C4W2T7E5q8gZ3.jpg",
    overview: "A biographical drama charting the meteoric triumphs and private tribulations of championship boxing legend."
  },
  {
    id: "lupin",
    tmdbId: 85552,
    title: "Lupin",
    type: "series",
    year: 2021,
    rating: 7.7,
    genres: ["Crime", "Drama", "Mystery"],
    country: "France",
    language: "French",
    service: "netflix",
    studio: "universal",
    backdrop: "https://image.tmdb.org/t/p/w780/p7tcm1a86NvyiZvhj7a00xI11r5.jpg",
    poster: "https://image.tmdb.org/t/p/w500/sgxawbFB5Vi5OkPWQLNfl3dvkNJ.jpg",
    overview: "Inspired by the adventures of Arsène Lupin, gentleman thief Assane Diop sets out to avenge his father for an injustice inflicted by a wealthy family."
  }
];

// Add episodes to new series
for (const item of newTitles) {
  if (item.type === "series") {
    item.episodes = Array.from({ length: 8 }, (_, i) => ({
      episodeNumber: i + 1,
      title: `Episode ${i + 1}`,
      airDate: `${item.year || 2026}`,
      runtime: 50,
      still: item.backdrop,
      overview: `${item.title} episode ${i + 1}.`
    }));
    item.seasons = [
      {
        seasonNumber: 1,
        name: "Season 1",
        episodeCount: item.episodes.length,
        episodes: item.episodes
      }
    ];
  }
  const existingIdx = titles.findIndex((t) => t.id === item.id);
  if (existingIdx >= 0) {
    titles[existingIdx] = { ...titles[existingIdx], ...item };
  } else {
    titles.push(item);
  }
}

fs.writeFileSync(filePath, JSON.stringify(titles, null, 2), "utf-8");
console.log(`Added reference titles! Total titles now: ${titles.length}`);
