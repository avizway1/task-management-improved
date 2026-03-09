from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, cast, Date

from database import get_db
from models import Task
from auth import get_current_user_id

router = APIRouter()


@router.get("/overview")
async def get_overview(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a summary of all tasks for the authenticated user:
    total, completed, inProgress, pending, highPriority, overdue, completionRate.
    """
    today = datetime.utcnow().date()

    result = await db.execute(
        select(
            func.count(Task.id).label("total"),
            func.sum(case((Task.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((Task.status == "in-progress", 1), else_=0)).label("in_progress"),
            func.sum(case((Task.status == "pending", 1), else_=0)).label("pending"),
            func.sum(case((Task.priority == "high", 1), else_=0)).label("high_priority"),
            func.sum(
                case(
                    (
                        and_(
                            Task.dueDate.isnot(None),
                            Task.dueDate < today,
                            Task.status != "completed",
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("overdue"),
        ).where(Task.userId == user_id)
    )

    row = result.one()
    total = row.total or 0
    completed = row.completed or 0
    completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "total": total,
        "completed": completed,
        "inProgress": row.in_progress or 0,
        "pending": row.pending or 0,
        "highPriority": row.high_priority or 0,
        "overdue": row.overdue or 0,
        "completionRate": completion_rate,
    }


@router.get("/trends")
async def get_trends(
    days: int = 30,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily task creation and completion counts for the last N days.
    """
    since = datetime.utcnow() - timedelta(days=days)

    created_rows = await db.execute(
        select(
            cast(Task.createdAt, Date).label("date"),
            func.count(Task.id).label("created"),
        )
        .where(and_(Task.userId == user_id, Task.createdAt >= since))
        .group_by(cast(Task.createdAt, Date))
        .order_by(cast(Task.createdAt, Date))
    )

    completed_rows = await db.execute(
        select(
            cast(Task.completedAt, Date).label("date"),
            func.count(Task.id).label("completed"),
        )
        .where(
            and_(
                Task.userId == user_id,
                Task.completedAt.isnot(None),
                Task.completedAt >= since,
            )
        )
        .group_by(cast(Task.completedAt, Date))
        .order_by(cast(Task.completedAt, Date))
    )

    created_map = {str(r.date): r.created for r in created_rows}
    completed_map = {str(r.date): r.completed for r in completed_rows}
    all_dates = sorted(set(list(created_map.keys()) + list(completed_map.keys())))

    return {
        "period": f"Last {days} days",
        "trends": [
            {
                "date": date,
                "created": created_map.get(date, 0),
                "completed": completed_map.get(date, 0),
            }
            for date in all_dates
        ],
    }


@router.get("/priority-distribution")
async def get_priority_distribution(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns how many tasks exist per priority level with percentages."""
    rows = await db.execute(
        select(Task.priority, func.count(Task.id).label("count"))
        .where(Task.userId == user_id)
        .group_by(Task.priority)
    )

    dist = {r.priority: r.count for r in rows}
    total = sum(dist.values())

    return {
        "distribution": [
            {
                "priority": p,
                "count": dist.get(p, 0),
                "percentage": round(dist.get(p, 0) / total * 100, 1) if total > 0 else 0,
            }
            for p in ["high", "medium", "low"]
        ]
    }


@router.get("/productivity")
async def get_productivity(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Compares tasks completed this week vs the previous week
    and returns a trend percentage.
    """
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    current_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(Task.userId == user_id, Task.completedAt >= week_ago)
        )
    )
    prev_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.userId == user_id,
                Task.completedAt >= two_weeks_ago,
                Task.completedAt < week_ago,
            )
        )
    )

    current = current_result.scalar() or 0
    previous = prev_result.scalar() or 0
    trend = round(((current - previous) / previous * 100), 1) if previous > 0 else 0.0

    return {
        "currentWeekCompleted": current,
        "previousWeekCompleted": previous,
        "trend": trend,
        "improving": current >= previous,
    }
