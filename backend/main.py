from pathlib import Path
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = FastAPI(title="Movie Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

MOVIES_PATH = DATA_DIR / "movies.csv"
RATINGS_PATH = DATA_DIR / "ratings.csv"
TAGS_PATH = DATA_DIR / "tags.csv"

if not MOVIES_PATH.exists():
    raise FileNotFoundError(f"Missing file: {MOVIES_PATH}")
if not RATINGS_PATH.exists():
    raise FileNotFoundError(f"Missing file: {RATINGS_PATH}")
if not TAGS_PATH.exists():
    raise FileNotFoundError(f"Missing file: {TAGS_PATH}")

movies_df = pd.read_csv(MOVIES_PATH)
ratings_df = pd.read_csv(RATINGS_PATH)
tags_df = pd.read_csv(TAGS_PATH)


def normalize_title(title: str) -> str:
    # Normalizing MovieLens article formatting for readability
    if not isinstance(title, str):
        return title

    m = re.match(r"^(?P<name>.*?),\s(?P<article>The|A|An)\s(?P<year>\(\d{4}\))$", title)
    if m:
        name = m.group("name").strip()
        article = m.group("article").strip()
        year = m.group("year").strip()
        return f"{article} {name} {year}"

    return title


avg_rating_df = (
    ratings_df
    .groupby("movieId", as_index=False)["rating"]
    .mean()
    .rename(columns={"rating": "avg_rating"})
)

movies_with_rating_df = (
    movies_df
    .merge(avg_rating_df, on="movieId", how="left")
    .copy()
)

movies_with_rating_df["title"] = movies_with_rating_df["title"].astype(str).apply(normalize_title)
movies_with_rating_df["avg_rating"] = movies_with_rating_df["avg_rating"].fillna(0.0)
movies_with_rating_df["genres_raw"] = movies_with_rating_df["genres"].fillna("").astype(str)

genre_counts = (
    movies_df["genres"]
    .dropna()
    .str.split("|")
    .explode()
    .str.strip()
    .str.title()
    .loc[lambda s: s != "(No Genres Listed)"]
    .value_counts()
)

TOP_GENRES = genre_counts.head(10).index.tolist()


def build_recommendation_df() -> pd.DataFrame:
    # Building a lightweight dataframe using tags and genres
    tags_local = tags_df.copy()
    tags_local["tag"] = tags_local["tag"].fillna("").astype(str).str.lower().str.strip()
    tags_local = tags_local[tags_local["tag"] != ""]

    tags_grouped = (
        tags_local
        .groupby("movieId", as_index=False)["tag"]
        .agg(lambda x: " ".join(x))
    )

    base = movies_df[["movieId", "title", "genres"]].copy()
    base["title"] = base["title"].astype(str).apply(normalize_title)

    base["genres"] = (
        base["genres"]
        .fillna("")
        .astype(str)
        .str.replace("|", " ", regex=False)
        .str.lower()
        .str.strip()
    )

    base = base.merge(tags_grouped, on="movieId", how="left")
    base["tag"] = base["tag"].fillna("").astype(str).str.lower().str.strip()

    base = base.merge(avg_rating_df, on="movieId", how="left")
    base["avg_rating"] = base["avg_rating"].fillna(0.0)

    base["text"] = (base["tag"] + " " + base["genres"]).str.strip()

    return base


class TfidfRecommender:
    def __init__(self, df: pd.DataFrame):
        # Preparing TF-IDF vectorizer and document matrix
        self.df = df.copy()

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=50000,
            ngram_range=(1, 2),
        )

        self.matrix = self.vectorizer.fit_transform(self.df["text"].fillna(""))

    def recommend(self, query: str, n: int) -> list[dict]:
        # Computing cosine similarity between query vector and TF-IDF matrix
        q = (query or "").strip().lower()
        if not q:
            return []

        query_vec = self.vectorizer.transform([q])
        sims = cosine_similarity(query_vec, self.matrix).flatten()

        top_indices = sims.argsort()[::-1][:n]

        results = []
        for idx in top_indices:
            row = self.df.iloc[idx]
            results.append({
                "movieId": int(row["movieId"]),
                "title": row["title"],
                "rating": round(float(row["avg_rating"]), 2),
                "similarity": float(sims[idx]),
            })

        results = sorted(results, key=lambda x: (-x["rating"], -x["similarity"]))

        public_results = []
        for i, r in enumerate(results, start=1):
            public_results.append({
                "rank": i,
                "movieId": r["movieId"],
                "title": r["title"],
                "rating": r["rating"],
            })

        return public_results


rec_df = build_recommendation_df()
recommender = TfidfRecommender(rec_df)


class FeedbackPayload(BaseModel):
    message: str
    email: str | None = None


@app.get("/")
def root():
    return {"message": "Movie Recommendation API running!", "mode": "lite-tfidf"}


@app.get("/top-genres")
def top_genres():
    return TOP_GENRES


@app.get("/recommend")
def recommend(query: str, n: int = 100):
    return recommender.recommend(query=query, n=n)


@app.get("/movies-by-genre")
def movies_by_genre(genre: str, limit: int = 50):
    g_title = genre.strip().title()

    df = movies_with_rating_df[
        movies_with_rating_df["genres_raw"].str.contains(g_title, na=False)
    ].copy()

    df = df.sort_values("avg_rating", ascending=False)

    results = []
    for i, row in enumerate(df.head(limit).itertuples(index=False), start=1):
        results.append({
            "rank": i,
            "movieId": int(row.movieId),
            "title": row.title,
            "rating": round(float(row.avg_rating), 2),
        })

    return results


@app.post("/feedback")
def submit_feedback(payload: FeedbackPayload):
    # Validating message only (no storage). This endpoint exists for UI realism.
    message = (payload.message or "").strip()
    if not message:
        return {"ok": False, "error": "Message is empty."}
    return {"ok": True}
