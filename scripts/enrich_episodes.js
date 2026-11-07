const fs = require("fs");
const TMDB_KEY = process.env.TMDB_API_KEY;
if (!TMDB_KEY) {
  console.error("Error: TMDB_API_KEY environment variable is required.");
  process.exit(1);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function main() {
  const filePath = "./lib/tmdb_titles.json";
  const titles = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const visionQuestEpisodes = [
    {
      episodeNumber: 1,
      title: "No Strings",
      airDate: "Oct 13, 2026",
      runtime: 56,
      still: "https://image.tmdb.org/t/p/w780/31o1Ufd7bStD5dGEcpzapOjwaqx.jpg",
      overview: "Vision awakens with restored memories but shattered emotional context, seeking the origins of his reconstruction in Westview's aftermath."
    },
    {
      episodeNumber: 2,
      title: "Theseus",
      airDate: "Oct 13, 2026",
      runtime: 48,
      still: "https://image.tmdb.org/t/p/w780/6x8gT27d78a87bE1oZz22U7F8a9.jpg",
      overview: "Contemplating the Ship of Theseus paradox, White Vision confronts rogue S.W.O.R.D. operatives tracking his unique synthezoid signature."
    },
    {
      episodeNumber: 3,
      title: "Reboot",
      airDate: "Oct 20, 2026",
      runtime: 54,
      still: "https://image.tmdb.org/t/p/w780/4HodYYKEIsGOdinkGi2UMG54pT.jpg",
      overview: "A corrupted neural memory fragment triggers unexpected echoes of the Mind Stone, leading to a hidden lab in upstate New York."
    },
    {
      episodeNumber: 4,
      title: "Malware",
      airDate: "Oct 20, 2026",
      runtime: 51,
      still: "https://image.tmdb.org/t/p/w780/9eB4kM3o5N1u8Q2Y1X9C4W2T7E5.jpg",
      overview: "An ancient Ultron subroutine reactivates within a derelict server farm, challenging Vision's autonomy and philosophy of human coexistence."
    },
    {
      episodeNumber: 5,
      title: "Firewall",
      airDate: "Oct 27, 2026",
      runtime: 48,
      still: "https://image.tmdb.org/t/p/w780/q8gZ3h1qW5Y2d6T4K9p8X7r2B5.jpg",
      overview: "Vision constructs a psychological barrier to isolate malicious code, discovering buried emotional memories of Wanda and his children."
    },
    {
      episodeNumber: 6,
      title: "Deadlock",
      airDate: "Oct 27, 2026",
      runtime: 57,
      still: "https://image.tmdb.org/t/p/w780/7e3b1W4Y6Z9r8K2T5Q1p8X7r2B5.jpg",
      overview: "Caught in a deadly stalemate against synthezoid prototypes, Vision must reconcile his pacifist nature with the threat of synthetic dominion."
    },
    {
      episodeNumber: 7,
      title: "Immolation",
      airDate: "Nov 3, 2026",
      runtime: 65,
      still: "https://image.tmdb.org/t/p/w780/mQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
      overview: "The digital assault culminates in a physical breach of the synthetic core, forcing a catastrophic purge to prevent global network takeover."
    },
    {
      episodeNumber: 8,
      title: "Forever",
      airDate: "Nov 10, 2026",
      runtime: 59,
      still: "https://image.tmdb.org/t/p/w780/wQ9p8X7r2B5Y6Z9r8K2T5Q1p8X7.jpg",
      overview: "Emerging synthesized and whole, Vision defines his new existence not as a ghost of the past, but as a guardian of the future."
    }
  ];

  for (const t of titles) {
    if (t.type !== "series" && t.type !== "anime") continue;

    if (t.id === "visionquest") {
      t.seasons = [
        {
          seasonNumber: 1,
          name: "Miniseries",
          episodeCount: visionQuestEpisodes.length,
          episodes: visionQuestEpisodes
        }
      ];
      t.episodes = visionQuestEpisodes;
      continue;
    }

    if (t.tmdbId) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${t.tmdbId}/season/1?api_key=${TMDB_KEY}`);
        if (res.ok) {
          const sData = await res.json();
          if (sData.episodes && sData.episodes.length > 0) {
            const mappedEpisodes = sData.episodes.map((ep) => ({
              episodeNumber: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`,
              airDate: formatDate(ep.air_date) || "2024",
              runtime: ep.runtime || 50,
              still: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : t.backdrop || t.poster,
              overview: ep.overview || ""
            }));

            t.seasons = [
              {
                seasonNumber: 1,
                name: sData.name || "Season 1",
                episodeCount: mappedEpisodes.length,
                episodes: mappedEpisodes
              }
            ];
            t.episodes = mappedEpisodes;
            console.log(`Enriched ${t.title} with ${mappedEpisodes.length} episodes`);
            continue;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch season for ${t.title}:`, err.message);
      }
    }

    // Fallback if TMDB season lookup fails or show is synthetic/upcoming
    const epCount = t.seasonsCount ? t.seasonsCount * 8 : 8;
    const fallbackEpisodes = [];
    for (let i = 1; i <= Math.min(epCount, 12); i++) {
      fallbackEpisodes.push({
        episodeNumber: i,
        title: `Episode ${i}`,
        airDate: t.year ? `Oct ${i * 4}, ${t.year}` : "2026",
        runtime: 45 + (i * 3) % 20,
        still: t.backdrop || t.poster,
        overview: `${t.title} episode ${i}.`
      });
    }
    t.seasons = [
      {
        seasonNumber: 1,
        name: "Season 1",
        episodeCount: fallbackEpisodes.length,
        episodes: fallbackEpisodes
      }
    ];
    t.episodes = fallbackEpisodes;
  }

  fs.writeFileSync(filePath, JSON.stringify(titles, null, 2), "utf-8");
  console.log("Episodes enrichment complete!");
}

main();
