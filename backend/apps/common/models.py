from typing import TYPE_CHECKING
import uuid
from django.db import models
from django.core.exceptions import ObjectDoesNotExist

class TimeStampedModel(models.Model):
    """Abstract base model with auto-managed created_at and updated_at timestamps."""
    if TYPE_CHECKING:
        id: int
        pk: int

    objects = models.Manager()
    DoesNotExist = ObjectDoesNotExist

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class UUIDTimeStampedModel(TimeStampedModel):
    """Abstract base model with UUID primary key and timestamps."""
    objects = models.Manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True
