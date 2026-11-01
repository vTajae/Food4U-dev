import logging
import os
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import APIRouter, Body, Query
from fastapi import Depends, HTTPException, Request
from jwt.exceptions import ExpiredSignatureError, PyJWTError
from jwt import decode
from app.api.dependencies.auth_dep import bearer_token, get_current_user, public_id_from_claims, verified_public_id
from app.api.dependencies.user_dep import get_user_service
from app.api.schemas.food4u.user import UserModel
from app.api.services.user_service import UserService
from app.api.services.food4u.profile_service import ProfileService
from app.api.models.food4u.user import Profile
from app.api.schemas.food4u.welcome import WelcomeFormData
from app.api.dependencies.food4u_dep import get_goals_service, get_medical_service, get_preference_service, get_profile_service
from app.api.schemas.food4u.medical import DietTypeCreate, DietTypeResponse, ICDCodesCreate
from app.api.services.food4u.goal_service import GoalService
from app.api.services.food4u.medical_service import MedicalService
from app.api.services.food4u.preferences_service import PreferenceService
from app.api.schemas.food4u.profile import ProfileSchema
from app.api.utils.utils import RateLimitUtil


router = APIRouter()
logger = logging.getLogger(__name__)

load_dotenv()

USER_JWT_SECRET_KEY = os.getenv('USER_JWT_SECRET_KEY')
USER_JWT_ALGORITHM = os.getenv('USER_JWT_ALGORITHM')


async def _ensure_profile(request: Request, service: UserService) -> UserModel:
    """Create-or-get the caller's profile, keyed by the JWT's public id."""
    token = bearer_token(request)
    try:
        payload = decode(token, USER_JWT_SECRET_KEY, algorithms=[USER_JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token has expired")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    public_id = public_id_from_claims(payload)
    if public_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    profile = await service.create_profile(public_id)
    if not profile:
        raise HTTPException(status_code=400, detail="Profile creation failed")
    return profile


@router.post("/profile", response_model=UserModel)
async def ensure_profile(request: Request, service: UserService = Depends(get_user_service)):
    """Idempotent: creates the profile on first call, returns it afterwards."""
    return await _ensure_profile(request, service)


@router.get("/profile", response_model=UserModel, deprecated=True)
async def create_profile(request: Request, service: UserService = Depends(get_user_service)):
    """Kept for older clients. It creates on first call, so prefer POST /profile."""
    profile = await _ensure_profile(request, service)
    # One line per hit so removal can be timed from logs. Never log the token.
    logger.warning(
        "deprecated GET /profile used public_id=%s ua=%s",
        profile.public_id,
        request.headers.get("user-agent") or "-",
    )
    return profile


@router.get("/dashboard")
async def dashboard():
    # Your dashboard logic here
    return {"message": "Welcome to the dashboard"}


@router.get("/user/profile", response_model=ProfileSchema)
async def user_profile(
    user: Profile = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    if not user.id:
        raise HTTPException(
            status_code=401, detail="Session invalid or expired, please login.")

    data = await profile_service.get_all_profile_info(user.id)

    return data


@router.post("/user/medical")
async def user_profile(
    user: Profile = Depends(get_current_user),
    body: ICDCodesCreate = Body(...),  # Use Body to grab the JSON payload
    user_service: UserService = Depends(get_user_service),
):
    if not user.id:
        raise HTTPException(
            status_code=401, detail="Session invalid or expired, please login.")

    data = await user_service.addMedicalCode(user.id, medical_code=body.icd10cm, description=body.description)

    return ({"data": data})


@router.post("/welcome")
async def welcome(
    form: WelcomeFormData,
    user: Profile = Depends(get_current_user),
    medical_service: MedicalService = Depends(get_medical_service),
    # goals_service: GoalService = Depends(get_goals_service),
    preferences_service: PreferenceService = Depends(get_preference_service)
):

    if not user.id:
        raise HTTPException(
            status_code=401, detail="Session invalid or expired, please login.")

    if not form.submission:
        raise HTTPException(status_code=400, detail="No submission data found")

    for answer in form.submission:
        # Convert questionId to string for prefix matching
        question_id = answer.questionId
        suggestions = answer.answers
        query_key = answer.queryKey

        # Get category based on questionId prefix
        category = RateLimitUtil.get_category_by_question_id(str(question_id))

        # Route to the appropriate service based on the category
        if category == "medical":
            await medical_service.post_medical(user.id, query_key, suggestions)
        # elif category == "goals":
        #     await goals_service.post_goals(user.id, suggestions)
        elif category == "preferences":
            await preferences_service.post_preferences(user.id, question_id, query_key, suggestions)
        else:
            # Log the unrecognized prefix and continue processing the next entry
            logging.warning(f"Unrecognized questionId prefix: {question_id}")
            continue

    return {"status": "success", "message": "Data processed successfully"}


# Assuming these services are injected using FastAPI's Depends
@router.get("/refs")
async def refs(
    queryKey: Optional[str] = Query(default=None),
    medical_service: MedicalService = Depends(get_medical_service),
    goals_service: GoalService = Depends(get_goals_service),
    preferences_service: PreferenceService = Depends(get_preference_service),
):
    # Check the queryKey and call the appropriate service
    if queryKey == "diets":
        data = await preferences_service.get_all_diet_types()
    # elif queryKey == "preferences":
    #     data = await preferences_service.getAllPreferences()
    else:
        return {"error": "Invalid query key"}

    return data


@router.post("/diet-types/", response_model=DietTypeResponse, dependencies=[Depends(verified_public_id)])
async def create_diet_type(
    diet_type_data: DietTypeCreate,
    preferences_service: PreferenceService = Depends(get_preference_service),

):
    existing_diet_type = await preferences_service.get_diet_type_by_name(diet_type_data.name)
    if existing_diet_type:
        raise HTTPException(status_code=400, detail="Diet type already exists")

    new_diet_type = await preferences_service.create_diet_type(
        diet_type_data
    )

    return new_diet_type


@router.get("/diet-types/", response_model=List[DietTypeResponse])
async def get_all_diet_types(
    preferences_service: PreferenceService = Depends(get_preference_service)
):
    return await preferences_service.get_all_diet_types()


