import time
import threading
import uuid
from typing import Any, Optional


class CacheEntry:
    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.expiry = time.time() + ttl_seconds


class CacheManager:
    """
    Lightweight in-memory TTL cache.

    Thread-safe.
    Upload-scoped invalidation supported.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(CacheManager, cls).__new__(cls)
                cls._instance._store = {}
                cls._instance.default_ttl = 300  # seconds
                cls._instance._inst_lock = threading.Lock()
        return cls._instance

    def __init__(self, default_ttl: int = 300):
        # Already set up in __new__
        pass

    # ======================================================
    # INTERNAL UTIL
    # ======================================================

    def _is_expired(self, entry: CacheEntry) -> bool:
        return time.time() > entry.expiry

    def _build_key(self, upload_id: uuid.UUID, namespace: str) -> str:
        return f"analytics:{upload_id}:{namespace}"

    # ======================================================
    # SET
    # ======================================================

    def set(
        self,
        upload_id: uuid.UUID,
        namespace: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> None:

        key = self._build_key(upload_id, namespace)
        ttl = ttl if ttl is not None else self.default_ttl

        with self._inst_lock:
            self._store[key] = CacheEntry(value, ttl)

    # ======================================================
    # GET
    # ======================================================

    def get(
        self,
        upload_id: uuid.UUID,
        namespace: str,
    ) -> Optional[Any]:

        key = self._build_key(upload_id, namespace)

        with self._inst_lock:
            entry = self._store.get(key)

            if not entry:
                return None

            if self._is_expired(entry):
                del self._store[key]
                return None

            return entry.value

    # ======================================================
    # DELETE SINGLE
    # ======================================================

    def delete(
        self,
        upload_id: uuid.UUID,
        namespace: str,
    ) -> None:

        key = self._build_key(upload_id, namespace)

        with self._inst_lock:
            self._store.pop(key, None)

    # ======================================================
    # INVALIDATE ALL FOR UPLOAD
    # ======================================================

    def invalidate_upload(self, upload_id: uuid.UUID) -> None:
        """
        Remove all cached entries for a given upload_id.
        Called after review updates.
        """

        prefix = f"analytics:{upload_id}:"

        with self._inst_lock:
            keys_to_delete = [
                key for key in self._store.keys()
                if key.startswith(prefix)
            ]

            for key in keys_to_delete:
                del self._store[key]

    # ======================================================
    # CLEAR ALL (ADMIN)
    # ======================================================

    def clear(self) -> None:
        with self._inst_lock:
            self._store.clear()