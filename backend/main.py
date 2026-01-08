from pathlib import Path
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer


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

tags_df["tag"] = tags_df["tag"].fillna("").astype(str).str.lower()
tags_df = tags_df[tags_df["tag"].str.strip() != ""]

merged_df = movies_df.merge(tags_df, on="movieId", how="inner")
merged_df = merged_df.merge(ratings_df[["movieId", "rating"]], on="movieId", how="left")

clean_df = merged_df[["movieId", "title", "genres", "tag", "rating"]].copy()
clean_df["title"] = clean_df["title"].astype(str).apply(normalize_title)

clean_df["genres"] = (
    clean_df["genres"]
    .fillna("")
    .astype(str)
    .str.replace("|", " ", regex=False)
    .str.lower()
    .str.strip()
)

clean_df["tag"] = clean_df["tag"].fillna("").astype(str).str.lower().str.strip()

nlp_df = (
    clean_df
    .groupby(["movieId", "title", "genres"], as_index=False)
    .agg({
        "tag": lambda x: " ".join(x),
        "rating": lambda x: round(x.mean(), 2)
    })
)

nlp_df["rating"] = nlp_df["rating"].fillna("not rated")
nlp_df["text"] = (nlp_df["tag"] + " " + nlp_df["genres"]).str.strip()

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(nlp_df["text"], normalize_embeddings=True)


class FeedbackPayload(BaseModel):
    message: str
    email: str | None = None


@app.get("/")
def root():
    return {"message": "Movie Recommendation API running!"}


@app.get("/top-genres")
def top_genres():
    return TOP_GENRES


@app.get("/recommend")
def recommend(query: str, n: int = 100):
    query_emb = model.encode([query], normalize_embeddings=True)
    sims = cosine_similarity(query_emb, embeddings).flatten()
    top_indices = sims.argsort()[::-1][:n]

    results = []
    for idx in top_indices:
        row = nlp_df.iloc[idx]

        rating_value = row["rating"]
        try:
            numeric_rating = float(rating_value)
        except Exception:
            numeric_rating = None

        results.append({
            "movieId": int(row["movieId"]),
            "title": row["title"],
            "rating": rating_value,
            "similarity": float(sims[idx]),
            "numeric_rating": numeric_rating,
        })

    results = sorted(
        results,
        key=lambda x: (
            x["numeric_rating"] is None,
            -(x["numeric_rating"] or 0),
            -x["similarity"],
        )
    )

    public_results = []
    for i, r in enumerate(results, start=1):
        public_results.append({
            "rank": i,
            "movieId": r["movieId"],
            "title": r["title"],
            "rating": r["rating"],
        })

    return public_results


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
