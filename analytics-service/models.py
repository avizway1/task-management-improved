from sqlalchemy import Column, String, Enum, Date, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Task(Base):
    """Read-only mirror of the Tasks table managed by task-service (Node.js/Sequelize)."""

    __tablename__ = "Tasks"

    id = Column(String, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum("pending", "in-progress", "completed", name="enum_Tasks_status", create_type=False),
        nullable=False,
        default="pending",
    )
    priority = Column(
        Enum("low", "medium", "high", name="enum_Tasks_priority", create_type=False),
        nullable=False,
        default="medium",
    )
    userId = Column(String, nullable=False)
    dueDate = Column(Date, nullable=True)
    completedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)
