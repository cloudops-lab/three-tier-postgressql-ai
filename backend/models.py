from sqlalchemy import Column, Integer, String, Boolean
from pgvector.sqlalchemy import Vector
from database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    # 768 dimensions for Google Gemini embeddings (gemini-embedding-001)
    embedding = Column(Vector(768), nullable=True)