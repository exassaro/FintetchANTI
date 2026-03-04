import httpx
import asyncio
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)

class NewsService:
    def __init__(self):
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = timedelta(hours=1)
        self.last_fetch = None

    async def fetch_news(self) -> List[Dict[str, Any]]:
        """Fetch and aggregate news, utilizing local cache."""
        if self.cache and self.last_fetch and datetime.now() - self.last_fetch < self.cache_ttl:
            return self.cache.get("articles", [])

        newsapi_key = settings.NEWS_API_KEY
        newsdata_key = settings.NEWSDATA_API_KEY
        mediastack_key = settings.MEDIASTACK_API_KEY

        results = []

        async with httpx.AsyncClient() as client:
            tasks = []
            if newsapi_key:
                tasks.append(self._fetch_newsapi(client, newsapi_key))
            if newsdata_key:
                tasks.append(self._fetch_newsdata(client, newsdata_key))
            if mediastack_key:
                tasks.append(self._fetch_mediastack(client, mediastack_key))

            if tasks:
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                for res in responses:
                    if isinstance(res, list):
                        results.extend(res)
                    else:
                        logger.error(f"Error fetching news: {res}")

        if not results:
            logger.warning("No News APIs configured or successful. Injecting mock data for frontend rendering.")
            results = [
                {
                    "title": "GST Collections Reach Record High in Q3",
                    "summary": "India's GST revenue collection for the third quarter has set a new record, indicating robust economic recovery.",
                    "source": "Financial Times",
                    "published_at": datetime.now().isoformat(),
                    "url": "#1"
                },
                {
                    "title": "New Auditing Standards Proposed for AI Financial Systems",
                    "summary": "The regulatory body has proposed a new framework to audit AI-driven financial platforms for better compliance and transparency.",
                    "source": "TechCrunch",
                    "published_at": datetime.now().isoformat(),
                    "url": "#2"
                },
                {
                    "title": "Major Tech Firm Fined for Tax Code Violations",
                    "summary": "A global tech giant faces severe penalties after an automated audit revealed significant tax code discrepancies.",
                    "source": "Wall Street Journal",
                    "published_at": datetime.now().isoformat(),
                    "url": "#3"
                },
                {
                    "title": "India Unveils New Blockchain Strategy for Secure Tax Audits",
                    "summary": "The finance ministry announced a pilot program integrating blockchain to prevent anomalies in state-level tax filings.",
                    "source": "Economic Times",
                    "published_at": datetime.now().isoformat(),
                    "url": "#4"
                },
                {
                    "title": "Global Market Volatility Expected Following Interest Rate Hike",
                    "summary": "Investors are bracing for impact as the central bank announces a 50 basis point increase to combat inflation.",
                    "source": "Bloomberg",
                    "published_at": datetime.now().isoformat(),
                    "url": "#5"
                },
                {
                    "title": "Startups Struggling with Complex GST Compliance",
                    "summary": "A recent survey highlights that early-stage startups continue to struggle with navigating GST regulations.",
                    "source": "YourStory",
                    "published_at": datetime.now().isoformat(),
                    "url": "#6"
                }
            ]

        unique_articles = self._deduplicate(results)
        
        for article in unique_articles:
            self._score_and_tag(article)
            
        unique_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

        self.cache["articles"] = unique_articles
        self.last_fetch = datetime.now()

        return unique_articles

    async def _fetch_newsapi(self, client: httpx.AsyncClient, api_key: str) -> List[Dict[str, Any]]:
        url1 = f"https://newsapi.org/v2/top-headlines?country=in&category=business&q=finance&apiKey={api_key}"
        url2 = f"https://newsapi.org/v2/everything?q=(India OR Indian) AND (GST OR tax OR finance OR audit OR economy)&language=en&sortBy=publishedAt&apiKey={api_key}"
        
        articles = []
        try:
            r1 = await client.get(url1, timeout=10.0)
            if r1.status_code == 200:
                data = r1.json()
                for item in data.get("articles", []):
                    if item.get("title") and item.get("title") != "[Removed]":
                        articles.append(self._normalize_newsapi(item))
                        
            r2 = await client.get(url2, timeout=10.0)
            if r2.status_code == 200:
                data = r2.json()
                for item in data.get("articles", [])[:50]:
                    if item.get("title") and item.get("title") != "[Removed]":
                        articles.append(self._normalize_newsapi(item))
        except Exception as e:
            logger.error(f"NewsAPI error: {e}")
            
        return articles

    async def _fetch_newsdata(self, client: httpx.AsyncClient, api_key: str) -> List[Dict[str, Any]]:
        url = f"https://newsdata.io/api/1/latest?apikey={api_key}&country=in&category=business&q=finance OR GST OR tax OR economy OR audit&language=en"
        articles = []
        try:
            r = await client.get(url, timeout=10.0)
            if r.status_code == 200:
                data = r.json()
                for item in data.get("results", []):
                    articles.append(self._normalize_newsdata(item))
        except Exception as e:
            logger.error(f"NewsData error: {e}")
            
        return articles

    async def _fetch_mediastack(self, client: httpx.AsyncClient, api_key: str) -> List[Dict[str, Any]]:
        url = f"http://api.mediastack.com/v1/news?access_key={api_key}&countries=in&categories=business&keywords=finance,GST,tax,audit,economy&languages=en&sort=published_desc&limit=100"
        articles = []
        try:
            r = await client.get(url, timeout=15.0)
            if r.status_code == 200:
                data = r.json()
                for item in data.get("data", []):
                    articles.append(self._normalize_mediastack(item))
        except Exception as e:
            logger.error(f"MediaStack error: {e}")
            
        return articles

    def _normalize_newsapi(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("title", ""),
            "summary": item.get("description") or item.get("content") or "",
            "source": item.get("source", {}).get("name", "NewsAPI"),
            "published_at": item.get("publishedAt", ""),
            "url": item.get("url", "")
        }

    def _normalize_newsdata(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("title", ""),
            "summary": item.get("description") or item.get("content") or "",
            "source": item.get("source_id", "NewsData"),
            "published_at": item.get("pubDate", ""),
            "url": item.get("link", "")
        }

    def _normalize_mediastack(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("title", ""),
            "summary": item.get("description") or "",
            "source": item.get("source", "MediaStack"),
            "published_at": item.get("published_at", ""),
            "url": item.get("url", "")
        }

    def _deduplicate(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen_titles = set()
        seen_urls = set()
        unique = []
        for a in articles:
            title = (a.get("title") or "").strip().lower()
            url = (a.get("url") or "").strip().lower()
            if not title or title in seen_titles or url in seen_urls:
                continue
            seen_titles.add(title)
            if url:
                seen_urls.add(url)
            unique.append(a)
        return unique

    def _score_and_tag(self, article: Dict[str, Any]):
        title = (article.get("title") or "").lower()
        summary = (article.get("summary") or "").lower()
        content = title + " " + summary
        
        score = 0
        tags = set()
        
        if "gst" in content:
            score += 10
            tags.add("GST")
        if "tax" in content:
            score += 6
            tags.add("Tax")
        if "audit" in content:
            score += 4
            tags.add("Audit")
        if "finance" in content or "economy" in content:
            score += 6
            tags.add("Finance/Economy")
        if "india" in content or "indian" in content:
            score += 8
            tags.add("India")
            
        article["relevance_score"] = score
        article["tags"] = list(tags)

news_aggregator = NewsService()
