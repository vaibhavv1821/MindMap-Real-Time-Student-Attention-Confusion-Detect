from fastapi import APIRouter, HTTPException, Depends, status
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

from app.db.mongodb import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.schemas.auth import RegisterIn, LoginIn, RefreshIn, TokenOut, UserOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterIn):
    db = get_db()
    doc = {
        "full_name": data.full_name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": data.role.value,
        "is_active": True,
    }
    try:
        result = await db["users"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    return UserOut(id=str(result.inserted_id), full_name=doc["full_name"],
                    email=doc["email"], role=doc["role"])


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn):
    db = get_db()
    user = await db["users"].find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Same error for "no such user" and "wrong password" — don't leak which one.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user_id = str(user["_id"])
    return TokenOut(
        access_token=create_access_token(user_id, user["role"]),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/refresh", response_model=TokenOut)
async def refresh(data: RefreshIn):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    db = get_db()
    user = await db["users"].find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")

    user_id = str(user["_id"])
    return TokenOut(
        access_token=create_access_token(user_id, user["role"]),
        refresh_token=create_refresh_token(user_id),  # rotate refresh token too
    )


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(id=str(user["_id"]), full_name=user["full_name"],
                    email=user["email"], role=user["role"])
