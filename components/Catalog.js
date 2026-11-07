import { useMemo, useState } from "react";
import Layout from "./Layout";
import { PageHead, Chips, Select, TitleGrid, Empty } from "./Page";

const SORTS = [
  { value: "rating", label: "Top rated" },
  { value: "new", label: "Newest" },
  { value: "az", label: "A to Z" },
];

export default function Catalog({ pageTitle, sub, items, extraTools }) {
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState("rating");

  const genres = useMemo(() => {
    const set = new Set(items.flatMap((t) => t.genres));
    return [{ value: "all", label: "All" }, ...[...set].sort().map((g) => ({ value: g, label: g }))];
  }, [items]);

  const shown = useMemo(() => {
    const list = genre === "all" ? [...items] : items.filter((t) => t.genres.includes(genre));
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sort === "new") list.sort((a, b) => b.year - a.year || b.rating - a.rating);
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [items, genre, sort]);

  return (
    <Layout title={pageTitle} description={sub}>
      <div className="pageInner">
        <PageHead title={pageTitle} sub={sub}>
          {extraTools}
          <Select id="sort" label="Sort" value={sort} onChange={setSort} options={SORTS} />
        </PageHead>
        <div style={{ marginBottom: 28 }}>
          <Chips label="Genre" options={genres} value={genre} onChange={setGenre} />
        </div>
        {shown.length ? (
          <TitleGrid items={shown} />
        ) : (
          <Empty title="Nothing here yet" text="No titles match this filter. Try another genre." />
        )}
      </div>
    </Layout>
  );
}
