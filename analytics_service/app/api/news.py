from fastapi import APIRouter
from app.services.news_service import news_aggregator

router = APIRouter(prefix="/news", tags=["Financial News"])


@router.get("/")
async def get_financial_news():
    """
    Fetch and aggregate latest financial and business news
    from NewsAPI and NewsData.io.
    Results are merged, deduplicated, scored for GST relevance, and cached.
    """
    articles = await news_aggregator.fetch_news()
    return {
        "status": "success",
        "total_articles": len(articles),
        "articles": articles
    }
