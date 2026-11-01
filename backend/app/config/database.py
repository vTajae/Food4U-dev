import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url
from fastapi.concurrency import asynccontextmanager

# Local configuration is backend-scoped; repo-root Neon credentials are never defaults.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

CAT_FILE = os.getenv("CAT_FILE")
DATABASE_URL = os.getenv("DATABASE_URL")

# Create an SSL context
ssl_context = ssl.create_default_context()
if CAT_FILE:
    ssl_context.load_verify_locations(cafile=CAT_FILE)

# Define the Base class using SQLAlchemy
Base = declarative_base()

class AsyncDatabaseSession:
    def __init__(self, db_url):
        self.db_url = db_url
        self.engine = None
        self.session_factory = None

    async def init(self):
        if not self.db_url:
            raise RuntimeError(
                "DATABASE_URL is not set. For local runs, point it at a short-lived "
                "Neon child branch (see docs/neon-setup.md)."
            )
        url = make_url(self.db_url)
        # libpq URL options are not asyncpg connect keywords. TLS is verified
        # (hostname/SNI included) unless the URL says sslmode=disable, which only
        # the local Docker network uses; Neon URLs never carry it.
        plaintext = url.query.get("sslmode") == "disable"
        url = url.set(drivername="postgresql+asyncpg").difference_update_query(
            ["sslmode", "channel_binding"]
        )
        # Neon supports protocol-level prepared statements. Keep the normal
        # driver caches and bounded app pool (verified by neon_pooler_check.py).
        self.engine = create_async_engine(
            url,
            future=True,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            connect_args={} if plaintext else {"ssl": ssl_context},
            isolation_level='AUTOCOMMIT'
        )
        self.session_factory = sessionmaker(
            self.engine, expire_on_commit=False, class_=AsyncSession
        )

    async def create_all(self):
        async with self.engine.begin() as conn:
            # await conn.run_sync(Base.metadata.drop_all)  # Add cascade=True
            await conn.run_sync(Base.metadata.create_all)  # Create tables

    @asynccontextmanager
    async def get_session(self):
        async with self.session_factory() as session:
            yield session  # Provide session within async context

    async def close(self):
        await self.engine.dispose()  # Close the engine to free resources

# Initialize the database session globally
async_database_session = AsyncDatabaseSession(DATABASE_URL)
