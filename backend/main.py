import os
import sys
import asyncio
from typing import List

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from google import genai

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="3-Tier Gemini RAG App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini SDK Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6IQQTdCAKVKa7scLRly3nAMlyoGw7udeB0B63jcHSm2RQ")
ai_client = genai.Client(api_key=GEMINI_API_KEY)


def get_embedding(text_content: str) -> list[float]:
    try:
        response = ai_client.models.embed_content(
            model="text-embedding-004",
            contents=text_content
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"[Embedding Warning]: {e}")
        return []


@app.get("/items/count")
def get_total_count(db: Session = Depends(get_db)):
    return {"total": db.query(models.Item).count()}


@app.get("/items", response_model=List[schemas.ItemResponse])
def read_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db)
):
    return (
        db.query(models.Item)
        .order_by(models.Item.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.post("/items", response_model=schemas.ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    full_text = f"{item.title} {item.description or ''}"
    vector = get_embedding(full_text)
    if not vector:
        vector = None

    db_item = models.Item(
        title=item.title,
        description=item.description,
        completed=False,
        embedding=vector
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.post("/items/ask-rag")
def ask_rag_assistant(
    query: str = Query(..., description="User query"),
    db: Session = Depends(get_db)
):
    try:
        total_count = db.query(models.Item).count()
        context_text = ""
        retrieved_items = []

        # Try semantic retrieval if vectors exist
        query_vector = get_embedding(query)
        if query_vector:
            vector_str = "[" + ",".join(map(str, query_vector)) + "]"
            sql = text("""
                SELECT id, title, description, completed 
                FROM items 
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> :vec
                LIMIT 5
            """)
            results = db.execute(sql, {"vec": vector_str}).fetchall()
            retrieved_items = [{"id": r.id, "title": r.title} for r in results]
            if results:
                context_text = "\n".join([f"- Task #{r.id}: {r.title} ({r.description})" for r in results])

        prompt = f"""You are an assistant answering questions strictly based on the database state below.

Database Status:
- Total records in items table: {total_count}

Context / Matched Records:
{context_text if context_text else 'No vector-indexed items found.'}

User Question: {query}

Provide a direct, concise answer."""

        # Generate answer using Gemini
        ai_response = ai_client.models.generate_content(
            #model="gemini-2.5-flash",
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        return {
            "answer": ai_response.text,
            "retrieved_context": retrieved_items
        }

    except Exception as e:
        print(f"[RAG Error]: {e}")
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")