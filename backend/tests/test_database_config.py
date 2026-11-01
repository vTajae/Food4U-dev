import asyncio
import os
from pathlib import Path
import ssl
import subprocess
import sys

import pytest

from app.config.database import AsyncDatabaseSession


@pytest.mark.parametrize("scheme", ["postgresql", "postgresql+asyncpg"])
def test_neon_url_builds_asyncpg_engine_with_verified_tls(scheme):
    database = AsyncDatabaseSession(
        f"{scheme}://u:p@ep-example-pooler.neon.tech/neondb"
        "?sslmode=require&channel_binding=require"
    )
    asyncio.run(database.init())
    args, kwargs = database.engine.dialect.create_connect_args(database.engine.url)
    assert database.engine.url.drivername == "postgresql+asyncpg"
    assert "sslmode" not in kwargs
    assert "channel_binding" not in kwargs
    # The public engine connect seam merges connect_args with dialect kwargs.
    captured = {}
    def capture(*args, **kwargs):
        captured.update(kwargs)
        raise RuntimeError("connection captured")
    database.engine.sync_engine.dialect.connect = capture
    async def connect():
        with pytest.raises(RuntimeError, match="connection captured"):
            async with database.engine.connect():
                pass
    asyncio.run(connect())
    assert captured["ssl"].check_hostname is True
    assert captured["ssl"].verify_mode == ssl.CERT_REQUIRED
    asyncio.run(database.close())


def test_sslmode_disable_connects_without_tls_for_the_local_container_network():
    database = AsyncDatabaseSession("postgresql://u:p@db:5432/food4u?sslmode=disable")
    asyncio.run(database.init())
    captured = {}
    def capture(*args, **kwargs):
        captured.update(kwargs)
        raise RuntimeError("connection captured")
    database.engine.sync_engine.dialect.connect = capture
    async def connect():
        with pytest.raises(RuntimeError, match="connection captured"):
            async with database.engine.connect():
                pass
    asyncio.run(connect())
    assert "ssl" not in captured
    assert "sslmode" not in captured
    asyncio.run(database.close())


def test_plain_asyncpg_url_keeps_database_and_query():
    database = AsyncDatabaseSession("postgresql+asyncpg://u:p@localhost:5432/test?timeout=10")
    asyncio.run(database.init())
    assert database.engine.url.database == "test"
    assert database.engine.url.query["timeout"] == "10"
    asyncio.run(database.close())


def database_import(tmp_path, database_url=None, initialize=False, backend_url=None):
    # A synthetic repo-root env proves the rule without reading owner secrets.
    backend = tmp_path / "backend"
    config = backend / "app" / "config"
    config.mkdir(parents=True)
    source = Path(__file__).resolve().parents[1] / "app" / "config" / "database.py"
    (config / "database.py").write_bytes(source.read_bytes())
    (tmp_path / ".env.local").write_text("DATABASE_URL=postgresql://u:p@production.neon.tech/db\n")
    (backend / ".env").write_text("DATABASE_URL=" + backend_url if backend_url else "")
    env = os.environ.copy()
    env.pop("DATABASE_URL", None)
    env.pop("TEST_BACKEND_URL", None)
    if backend_url:
        env["TEST_BACKEND_URL"] = backend_url
    if database_url is not None:
        env["DATABASE_URL"] = database_url
    code = """
import asyncio
from unittest.mock import patch
import os
expected = os.environ.get("DATABASE_URL") or os.environ.get("TEST_BACKEND_URL")
from app.config import database
assert database.DATABASE_URL == expected, 'repo-root fallback is prohibited'
"""
    if initialize:
        code = code[:code.index("assert database.DATABASE_URL")]
        code += """
with patch.object(database, 'create_async_engine') as engine:
    try:
        asyncio.run(database.async_database_session.init())
    except RuntimeError as error:
        assert 'DATABASE_URL is not set' in str(error)
        assert 'short-lived Neon child branch' in str(error)
    else:
        raise AssertionError('missing DATABASE_URL must fail fast')
    engine.assert_not_called()
assert database.async_database_session.engine is None
"""
    return subprocess.run([sys.executable, "-c", code], cwd=backend, env=env,
                          capture_output=True, text=True, timeout=30)


def test_repo_root_env_is_not_a_database_default(tmp_path):
    result = database_import(tmp_path)
    assert result.returncode == 0, result.stderr


def test_missing_database_url_fails_before_engine_or_connection(tmp_path):
    result = database_import(tmp_path, initialize=True)
    assert result.returncode == 0, result.stderr


def test_process_database_url_is_used_as_is(tmp_path):
    result = database_import(tmp_path, "postgresql+asyncpg://u:p@localhost/test")
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("process_url", [None, "postgresql+asyncpg://u:p@localhost/process"])
def test_backend_env_is_scoped_and_process_values_win(tmp_path, process_url):
    result = database_import(tmp_path, process_url, backend_url="postgresql://u:p@localhost/backend")
    assert result.returncode == 0, result.stderr


def test_empty_database_url_also_fails_before_engine(tmp_path):
    result = database_import(tmp_path, "", initialize=True)
    assert result.returncode == 0, result.stderr
