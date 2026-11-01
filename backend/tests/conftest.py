"""Environment defaults for no-database API tests; no import stubs needed."""
import os

# Forced, not defaulted: the suite mints its own tokens and must not depend on the host's secret.
os.environ["USER_JWT_SECRET_KEY"] = "test-secret"
os.environ["USER_JWT_ALGORITHM"] = "HS256"
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/test")
# Retain optional config defaults; identity tests do not import the AI stack.
for _k, _v in {
    "REQUEST_TIMEOUT": "30", "MAX_RETRIES": "1", "TEMPERATURE": "0", "MAX_TOKENS": "1",
    "TOP_P": "1", "TOP_K": "1", "CHUNK_SIZE": "1", "CHUNK_OVERLAP": "0", "EMBED_BATCH_SIZE": "1",
    "GEMINI_API_KEY": "x", "GOOGLE_API_KEY": "x", "OPENAI_API_KEY": "x", "QDRANT_URL": "http://localhost",
    "QDRANT_API_KEY": "x", "COLLECTION_NAME": "x", "MODEL_NAME": "x", "EMBED_MODEL": "x",
    "GOOGLE_GEMINI_API_KEY": "x", "GOOGLE_DRIVE_FOLDER_ID": "x", "EMBEDDING_MODEL_NAME": "x",
    "LLM_MODEL": "x", "OPENAI_ORG_ID": "x", "FDC_API_KEY": "x", "SPOONACULAR_API_KEY": "x",
}.items():
    os.environ.setdefault(_k, _v)
