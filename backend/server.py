from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.dependencies.auth_dep import verified_public_id
from app.api.routers import user_routes, fdc_routes, spoon_routes, suggestion_routes
from app.config.database import async_database_session
from app.config.diet_seed import seed_diet_types
from app.api.dependencies.user_dep import get_user_service
from app.api.services.user_service import RATE_LIMIT_WINDOW





origins = ["https://food4u.pages.dev/"]

# Define your async context manager for lifespan events
async def lifespan(app: FastAPI):
    await async_database_session.init()  # Initialize DB session
    await async_database_session.create_all()  # Create tables
    await seed_diet_types(async_database_session)
    yield  # Startup actions done, separate from shutdown
    await async_database_session.close()  # Close DB connection

# Create your FastAPI app using the lifespan context manager
app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specified origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"]  # Allows all headers
)



@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    async with async_database_session.get_session() as db:
        user_service = await get_user_service(db)
        allowed = await user_service.rate_limiter(request)
    # Release the limiter session before the route acquires its request session.
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests"},
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Registering all routes
app.include_router(user_routes.router)
# The upstream food APIs are metered; a verified bearer is required before any client is built.
app.include_router(fdc_routes.router, dependencies=[Depends(verified_public_id)])
app.include_router(spoon_routes.router, dependencies=[Depends(verified_public_id)])
app.include_router(suggestion_routes.router)





