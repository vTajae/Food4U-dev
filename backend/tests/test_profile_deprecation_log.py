"""
The deprecated GET /profile must be observable: one WARNING per hit, naming the
public id and user agent, never the bearer token. POST /profile stays silent.
This lets its removal be timed from production logs.
"""
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.dependencies.user_dep import get_user_service
from app.api.routers import user_routes
from test_public_id_auth import FakeUserService, make_token

PUBLIC_ID = "5f1c3a2e-0000-4000-8000-00000000dead"


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(user_routes.router)
    app.dependency_overrides[get_user_service] = lambda: FakeUserService()
    return TestClient(app)


def deprecation_records(caplog):
    return [r for r in caplog.records if "deprecated GET /profile" in r.getMessage()]


def test_get_profile_logs_one_warning_with_public_id_and_user_agent(client, caplog):
    token = make_token({"user_id": PUBLIC_ID})
    with caplog.at_level(logging.WARNING, logger="app.api.routers.user_routes"):
        r = client.get(
            "/profile",
            headers={"Authorization": f"Bearer {token}", "User-Agent": "food4u-remix/1.0"},
        )
    assert r.status_code == 200, r.text
    assert r.json()["public_id"] == PUBLIC_ID

    records = deprecation_records(caplog)
    assert len(records) == 1
    message = records[0].getMessage()
    assert records[0].levelno == logging.WARNING
    assert f"public_id={PUBLIC_ID}" in message
    assert "ua=food4u-remix/1.0" in message
    assert token not in message
    assert "Bearer" not in message


def test_get_profile_without_user_agent_logs_a_dash(client, caplog):
    token = make_token({"user_id": PUBLIC_ID})
    with caplog.at_level(logging.WARNING, logger="app.api.routers.user_routes"):
        client.get("/profile", headers={"Authorization": f"Bearer {token}", "User-Agent": ""})
    assert "ua=-" in deprecation_records(caplog)[0].getMessage()


def test_post_profile_does_not_log_the_deprecation(client, caplog):
    token = make_token({"user_id": PUBLIC_ID})
    with caplog.at_level(logging.WARNING, logger="app.api.routers.user_routes"):
        r = client.post("/profile", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert deprecation_records(caplog) == []
