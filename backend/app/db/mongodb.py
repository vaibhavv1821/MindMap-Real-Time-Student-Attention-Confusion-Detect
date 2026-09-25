from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient | None = None


def get_db():
    """Returns the active database handle. Call connect_db() first at startup."""
    global client
    if client is None:
        if settings.mongodb_uri:
            client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        else:
            raise RuntimeError("Database client is not connected. MongoDB is running in decoupled mode.")
    return client[settings.db_name]


def get_client() -> AsyncIOMotorClient | None:
    """Returns the active AsyncIOMotorClient instance if connected, else None."""
    return client


async def connect_db():
    """Initializes MongoDB Atlas client, verifies connection with ping, and ensures indexes."""
    global client
    if not settings.mongodb_uri:
        raise ValueError("MONGODB_URI is not configured.")

    client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
    )
    # Ping the server to verify Atlas connection
    await client.admin.command("ping")
    # Ensure email uniqueness at the DB level — never rely on app logic alone for this.
    await client[settings.db_name]["users"].create_index("email", unique=True)


async def ping_db() -> bool:
    """Verifies whether MongoDB is currently reachable and responding to ping commands."""
    global client
    if client is None:
        if settings.mongodb_uri:
            try:
                await connect_db()
            except Exception:
                return False
        else:
            return False
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False



async def close_db():
    global client
    if client:
        client.close()
        client = None

