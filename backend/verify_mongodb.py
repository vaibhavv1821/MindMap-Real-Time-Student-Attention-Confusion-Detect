"""
MindMap - MongoDB Atlas Connection & CRUD Verification Script
=============================================================

Safely tests MongoDB Atlas connectivity:
1. Loads MONGODB_URI and MONGODB_DATABASE from environment / .env
2. Verifies that credentials are not exposed
3. Executes a server ping against the MongoDB Atlas cluster
4. Performs a harmless read/write/delete verification on a temporary test record
5. Reports database health status safely

Usage:
    python verify_mongodb.py
"""

import sys
import os
import asyncio
import time
from app.core.config import settings
from app.db.mongodb import connect_db, close_db, get_client, get_db



def sanitize_uri(uri: str) -> str:
    """Masks credentials in MongoDB URI for safe display."""
    if not uri:
        return "<EMPTY>"
    try:
        if "@" in uri:
            prefix, rest = uri.split("@", 1)
            scheme = prefix.split("://")[0] + "://"
            return f"{scheme}****:****@{rest}"
        return uri
    except Exception:
        return "<MASKED_URI>"


async def run_verification():
    print("=" * 60)
    print("MindMap MongoDB Atlas Verification Utility")
    print("=" * 60)

    # 1. Environment Audit
    print(f"Database Name:         {settings.db_name}")
    print(f"Environment Variable:  MONGODB_URI")
    print(f"Masked Connection:     {sanitize_uri(settings.mongodb_uri)}")

    if not settings.mongodb_uri:
        print("\n[NOTICE] MONGODB_URI is not set in backend/.env.")
        print("The backend is running in DECOUPLED MODE (FastAPI and ML are fully operational).")
        print("\nTo connect to MongoDB Atlas, add your connection string to backend/.env:")
        print("MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/mindmap?retryWrites=true&w=majority")
        print("MONGODB_DATABASE=mindmap")
        print("=" * 60)
        return False

    print("\nAttempting connection to MongoDB Atlas...")
    try:
        await connect_db()
        print("[SUCCESS] MongoDB connected successfully.")
        print(f"Active Database:       {settings.db_name}")

        # 2. Ping Check
        print("Pinging MongoDB Atlas cluster...")
        c = get_client()
        ping_res = await c.admin.command("ping")
        print(f"[SUCCESS] Ping response: {ping_res}")

        # 3. Read/Write/Delete Test
        db = get_db()
        test_col = db["_connection_test"]
        test_doc = {
            "probe": "mindmap_connection_probe",
            "timestamp": time.time(),
            "status": "temporary_test_record",
        }


        print("Executing temporary record write...")
        insert_res = await test_col.insert_one(test_doc)
        inserted_id = insert_res.inserted_id
        print(f"[SUCCESS] Test document written (id: {inserted_id})")

        print("Executing temporary record read...")
        retrieved = await test_col.find_one({"_id": inserted_id})
        assert retrieved is not None, "Failed to retrieve test document"
        assert retrieved["probe"] == "mindmap_connection_probe"
        print(f"[SUCCESS] Test document verified: {retrieved['probe']}")

        print("Cleaning up temporary record...")
        del_res = await test_col.delete_one({"_id": inserted_id})
        assert del_res.deleted_count == 1, "Failed to delete test document"
        print("[SUCCESS] Temporary test record deleted cleanly. No data modified.")

        print("\n" + "=" * 60)
        print("ALL MONGODB ATLAS VERIFICATION CHECKS PASSED")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")
        print("Please check your Atlas username, password, and IP access list (0.0.0.0/0).")
        print("=" * 60)
        return False
    finally:
        await close_db()


if __name__ == "__main__":
    success = asyncio.run(run_verification())
    sys.exit(0 if success else 1)
