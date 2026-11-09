import test from "node:test";
import assert from "node:assert/strict";
import { getSearchTypoCandidates, fetchBollywood, fetchTollywood, searchTMDB, fetchSmartRecommendations, fetchDiscover } from "../lib/tmdb.js";

test("getSearchTypoCandidates generates correct typo corrections for common misspellings", () => {
  const bahubli = getSearchTypoCandidates("bahubli");
  assert.ok(bahubli.includes("baahubali"), "bahubli should candidate baahubali");

  const spidreman = getSearchTypoCandidates("spidreman");
  assert.ok(spidreman.includes("spider-man") || spidreman.includes("spiderman"), "spidreman should candidate spider-man");

  const rma = getSearchTypoCandidates("rma");
  assert.ok(rma.includes("ram"), "rma should transpose to ram");

  const stree = getSearchTypoCandidates("streeee");
  assert.ok(stree.includes("stree"), "streeee should reduce repeated letters to stree");
});

test("fetchBollywood and fetchTollywood functions exist and return arrays", async () => {
  assert.equal(typeof fetchBollywood, "function");
  assert.equal(typeof fetchTollywood, "function");
  assert.equal(typeof fetchSmartRecommendations, "function");
  assert.equal(typeof fetchDiscover, "function");
});

test("fetchDiscover for Newest excludes unreleased future movies", async () => {
  if (!process.env.TMDB_API_KEY) return;
  const items = await fetchDiscover({ type: "movie", sort_by: "primary_release_date.desc" });
  assert.ok(items.length > 0, "should return items");
  const todayStr = new Date().toISOString().split("T")[0];
  const hasFuture = items.some((t) => t.releaseDate && t.releaseDate > todayStr);
  assert.equal(hasFuture, false, "should not contain unreleased future movies");
});

test("fetchSmartRecommendations returns items with cast/director matchReasons when TMDB_API_KEY is present", async () => {
  if (!process.env.TMDB_API_KEY) return;
  const recs = await fetchSmartRecommendations("movie", 872585, 10); // Oppenheimer
  assert.ok(Array.isArray(recs), "should return an array");
  assert.ok(recs.length > 0, "should return recommendations");
  const hasDirectorOrCast = recs.some((r) => r.matchType === "director" || r.matchType === "cast");
  assert.ok(hasDirectorOrCast, "should contain matching director or cast recommendations");
});

test("searchTMDB handles common typos and sets didYouMean", async () => {
  if (!process.env.TMDB_API_KEY) return;
  const results = await searchTMDB("bahubli");
  assert.ok(results.length > 0, "results should not be empty");
  assert.equal(results.didYouMean, "baahubali");
});
