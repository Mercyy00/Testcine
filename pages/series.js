import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";
import TileRow from "../components/TileRow";
import { CatalogFilterBar, TitleGrid, Empty } from "../components/Page";
import { SERVICES, BRAND } from "../lib/constants";
import { getSeriesPageData } from "../lib/data.server";

export async function getStaticProps() {
  const data = getSeriesPageData();
  return {
    props: {
      ...data,
    },
    revalidate: 1800,
  };
}

const CATEGORIES = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "top", label: "Top Rated" },
  { value: "airing_today", label: "Airing Today" },
  { value: "on_air", label: "On Air" },
];

export default function Series({
  allSeries = [],
  heroItems = [],
  top = [],
  trending = [],
  popular = [],
}) {
  const [category, setCategory] = useState("trending");
  const [filters, setFilters] = useState({
    genre: "all",
    country: "all",
    year: "all",
    service: "all",
    language: "all",
    rating: "all",
  });
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [liveList, setLiveList] = useState(null);

  useEffect(() => {
    let active = true;
    const catMap = {
      trending: "trending",
      popular: "popular",
      top: "top",
      airing_today: "airing_today",
      on_air: "on_the_air",
    };
    const params = new URLSearchParams({
      type: "series",
      category: catMap[category] || category,
      genre: filters.genre,
      country: filters.country,
      year: filters.year,
      service: filters.service,
      language: filters.language,
      rating: filters.rating,
    });

    fetch(`/api/tmdb/discover?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setLiveList(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [category, filters]);

  const filterOptions = useMemo(() => {
    const genres = [
      ...new Set(allSeries.flatMap((t) => t.genres || [])),
    ].sort();
    const countries = [
      ...new Set(allSeries.map((t) => t.country).filter(Boolean)),
    ].sort();
    const years = [
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
      "2020s",
      "2010s",
      "Earlier",
    ];
    const services = SERVICES.map((s) => ({ value: s.id, label: s.name }));
    const languages = [
      ...new Set(allSeries.map((t) => t.language).filter(Boolean)),
    ].sort();

    return {
      genre: genres.map((g) => ({ value: g, label: g })),
      country: countries.map((c) => ({ value: c, label: c })),
      year: years.map((y) => ({ value: y, label: y })),
      service: services,
      language: languages.map((l) => ({ value: l, label: l })),
      rating: [
        { value: "8", label: "★ 8.0+" },
        { value: "7", label: "★ 7.0+" },
        { value: "6", label: "★ 6.0+" },
      ],
    };
  }, [allSeries]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleShuffle = () => {
    setShuffleSeed((s) => s + 1);
  };

  const shown = useMemo(() => {
    let list = [];
    if (category === "trending") {
      const rest = allSeries.filter((s) => !trending.some((t) => t.id === s.id));
      list = [...trending, ...rest];
    } else if (category === "popular") {
      const rest = allSeries.filter((s) => !popular.some((t) => t.id === s.id));
      list = [...popular, ...rest];
    } else if (category === "top") {
      list = [...allSeries].sort((a, b) => b.rating - a.rating);
    } else if (category === "airing_today") {
      list = allSeries.filter((s) => s.status === "airing" || s.year >= 2026);
    } else if (category === "on_air") {
      list = allSeries.filter((s) => s.status === "airing" || s.year >= 2024);
    } else {
      list = [...allSeries];
    }

    if (filters.genre !== "all") {
      list = list.filter((t) => (t.genres || []).includes(filters.genre));
    }
    if (filters.country !== "all") {
      list = list.filter((t) => t.country === filters.country);
    }
    if (filters.year !== "all") {
      if (filters.year === "2020s") list = list.filter((t) => t.year >= 2020);
      else if (filters.year === "2010s") list = list.filter((t) => t.year >= 2010 && t.year < 2020);
      else if (filters.year === "Earlier") list = list.filter((t) => t.year < 2010);
      else list = list.filter((t) => String(t.year) === filters.year);
    }
    if (filters.service !== "all") {
      list = list.filter((t) => t.service === filters.service);
    }
    if (filters.language !== "all") {
      list = list.filter((t) => t.language === filters.language);
    }
    if (filters.rating !== "all") {
      const min = Number(filters.rating);
      list = list.filter((t) => (t.rating || 0) >= min);
    }

    if (shuffleSeed > 0) {
      list = [...list].sort(() => Math.sin(shuffleSeed * 9999 + 1) - 0.5);
    }

    return list;
  }, [category, filters, shuffleSeed]);

  return (
    <Layout
      flush
      title="Series"
      description={`TV Series on ${BRAND.name}: binge-worthy dramas, thrillers and comedy.`}
    >
      <HeroBanner items={heroItems} />

      <section
        style={{
          padding: "36px var(--page-pad) 64px",
          maxWidth: "var(--page-max)",
          margin: "0 auto",
        }}
      >
        <CatalogFilterBar
          title="Series"
          category={category}
          onCategoryChange={setCategory}
          categories={CATEGORIES}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterOptions={filterOptions}
          onShuffle={handleShuffle}
        />

        {(liveList || shown).length ? (
          <TitleGrid items={liveList || shown} wide={true} />
        ) : (
          <Empty
            title="No series found"
            text="No TV series match your selected filters. Try another genre or year."
          />
        )}
      </section>

      <MediaRow title="Top 10 Series">
        {top.map((t, i) => (
          <MediaCard key={t.id} title={t} rank={i + 1} />
        ))}
      </MediaRow>

      <TileRow title="Browse by service" items={SERVICES} param="service" />
    </Layout>
  );
}
