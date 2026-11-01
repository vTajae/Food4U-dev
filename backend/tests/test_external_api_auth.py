"""Anonymous callers must not spend the USDA FoodData Central and Spoonacular quotas."""
from contextlib import asynccontextmanager
from types import SimpleNamespace

import jwt
import pytest
from fastapi.testclient import TestClient

import server
from app.api.dependencies import auth_dep, fdc_dep, spoon_dep
from app.api.routers import user_routes


@pytest.fixture
def client(monkeypatch):
    # The rate limiter and lifespan need a database; the gate under test does not.
    @asynccontextmanager
    async def no_session():
        yield None

    async def allow_everyone(db):
        async def rate_limiter(request):
            return True
        return SimpleNamespace(rate_limiter=rate_limiter)

    monkeypatch.setattr(server.async_database_session, "get_session", no_session)
    monkeypatch.setattr(server, "get_user_service", allow_everyone)

    def never():
        pytest.fail("an upstream API client was built for an unauthenticated request")

    server.app.dependency_overrides[fdc_dep.get_fdc_service] = never
    server.app.dependency_overrides[spoon_dep.get_spoon_service] = never
    server.app.dependency_overrides[user_routes.get_preference_service] = never
    yield TestClient(server.app)  # no `with`: startup (and its database work) stays off
    server.app.dependency_overrides.clear()


def bearer(public_id="e2e-user"):
    token = jwt.encode({"user_id": public_id}, auth_dep.USER_JWT_SECRET_KEY,
                       algorithm=auth_dep.USER_JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


def test_anonymous_fdc_request_is_refused_before_any_client_is_built(client):
    response = client.get("/fdc/v1/food/123")
    assert response.status_code == 403
    assert response.json() == {"detail": "No authentication token found"}


def test_anonymous_spoonacular_request_is_refused_before_any_client_is_built(client):
    response = client.post("/spoon/misc/detect-food-in-text", params={"text": "two eggs"})
    assert response.status_code == 403
    assert response.json() == {"detail": "No authentication token found"}


def test_anonymous_diet_type_creation_is_refused(client):
    response = client.post("/diet-types/", json={"name": "anything", "description": "written by a stranger"})
    assert response.status_code == 403
    assert response.json() == {"detail": "No authentication token found"}


def test_bearer_holder_still_reaches_the_fdc_service(client):
    class Service:
        async def get_food(self, fdc_id, format, nutrients):
            return {"fdcId": fdc_id, "format": format}

    server.app.dependency_overrides[fdc_dep.get_fdc_service] = Service
    response = client.get("/fdc/v1/food/123", headers=bearer())
    assert response.status_code == 200
    assert response.json() == {"fdcId": "123", "format": "full"}
