from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from app.core.security import decode_token
from app.db.mongodb import get_db
from app.models.user import Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = await get_db()["users"].find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or disabled")

    return user


def require_role(*allowed_roles: Role):
    """Usage: Depends(require_role(Role.teacher, Role.admin))"""
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return checker
