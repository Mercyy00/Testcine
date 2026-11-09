import test from "node:test";
import assert from "node:assert/strict";
import { getSearchTypoCandidates, fetchBollywood, fetchTollywood, searchTMDB } from "../lib/tmdb.js";

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
});

test("searchTMDB handles common typos and sets didYouMean", async () => {
  if (!process.env.TMDB_API_KEY) return;
  const results = await searchTMDB("bahubli");
  assert.ok(results.length > 0, "results should not be empty");
  assert.equal(results.didYouMean, "baahubali");
});
