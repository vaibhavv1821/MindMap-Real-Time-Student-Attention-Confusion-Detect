"""
MindMap Production User Seeding Utility.
Safely upserts authoritative TEACHER and STUDENT accounts into MongoDB Atlas.
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import Role


USERS_TO_SEED = [
    {
        "full_name": "Dr. Alan Vance",
        "email": "teacher@mindmap.edu",
        "password": "Teacher@123",
        "role": Role.teacher.value,
    },
    {
        "full_name": "Alex Johnson",
        "email": "student@mindmap.edu",
        "password": "Student@123",
        "role": Role.student.value,
    },
]


async def seed_users():
    if not settings.mongodb_uri:
        print("[Seed] Error: MONGODB_URI is not set in environment or backend/.env.")
        return

    print(f"[Seed] Connecting to MongoDB Atlas ({settings.db_name})...")
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    db = client[settings.db_name]

    # Verify connection
    await client.admin.command("ping")
    print("[Seed] MongoDB Atlas connection verified.")

    # Ensure unique index on email
    await db["users"].create_index("email", unique=True)

    now = datetime.now(timezone.utc)
    for u in USERS_TO_SEED:
        existing = await db["users"].find_one({"email": u["email"]})
        if existing:
            await db["users"].update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "full_name": u["full_name"],
                        "password_hash": hash_password(u["password"]),
                        "role": u["role"],
                        "is_active": True,
                        "updated_at": now,
                    }
                },
            )
            print(f"[Seed] Updated existing {u['role'].upper()}: {u['email']} (Password: {u['password']})")
        else:
            doc = {
                "full_name": u["full_name"],
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "role": u["role"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            res = await db["users"].insert_one(doc)
            print(f"[Seed] Created new {u['role'].upper()}: {u['email']} [ID: {res.inserted_id}] (Password: {u['password']})")

    client.close()
    print("[Seed] Seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_users())
