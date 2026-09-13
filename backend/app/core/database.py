import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False

    async def connect_to_database(self) -> None:
        """Establish asynchronous connection to MongoDB (Atlas or Local)."""
        try:
            logger.info("Connecting to MongoDB at: %s", settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else "local")
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
            )
            self.db = self.client[settings.DATABASE_NAME]

            # Ping to verify active connection
            await self.client.admin.command("ping")
            self.is_connected = True
            logger.info("Successfully connected to MongoDB database: %s", settings.DATABASE_NAME)

            # Ensure collections and indices
            await self._create_indices()
        except Exception as e:
            self.is_connected = False
            logger.warning(
                "Could not establish connection to MongoDB (%s). "
                "The API will continue to operate, with scan records stored in fallback in-memory cache.",
                str(e),
            )

    async def close_database_connection(self) -> None:
        """Gracefully close MongoDB connection."""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB connection closed.")

    async def _create_indices(self) -> None:
        """Create needed indices for rapid lookups and analytics."""
        if self.db is not None and self.is_connected:
            try:
                # Index on species records
                await self.db.species_records.create_index("scientific_name", unique=True)
                await self.db.species_records.create_index("taxonomy_class")

                # Index on user scans
                await self.db.user_scans.create_index([("scanned_at", -1)])
                await self.db.user_scans.create_index("taxonomy_class")
                await self.db.user_scans.create_index("user_id")
                logger.info("Database indices verified.")
            except Exception as e:
                logger.warning("Error creating MongoDB indices: %s", str(e))

    def get_database(self) -> Optional[AsyncIOMotorDatabase]:
        return self.db if self.is_connected else None


db_manager = DatabaseManager()


async def get_db() -> Optional[AsyncIOMotorDatabase]:
    return db_manager.get_database()
