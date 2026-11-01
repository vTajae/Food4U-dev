import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

class AIConfig:
    # Directory where documents are stored

    # HuggingFace embedding model name
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME")

    # Ollama model and request timeout settings
    LLM_MODEL = os.getenv("LLM_MODEL")
    REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "30"))
