"""
YourGuideInUSA — Auto Blog System
Runs every evening, picks a topic, writes a full SEO article using Claude API,
fetches a relevant image from Pexels, and publishes to Supabase.
"""

import os
import re
import json
import time
import random
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(dotenv_path="../.env.local")
load_dotenv(dotenv_path=".env.local")

ANTHROPIC_API_KEY    = os.getenv("ANTHROPIC_API_KEY")
PEXELS_API_KEY       = os.getenv("PEXELS_API_KEY")
SUPABASE_URL         = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ── Topic bank — mix of high-traffic SEO topics for international students ──
TOPICS = [
    # Insurance
    {"title": "Health Insurance for F-1 Students in the USA", "category": "Insurance", "keywords": "health insurance F-1 visa students USA"},
    {"title": "Car Insurance for International Students — Complete Guide", "category": "Insurance", "keywords": "car insurance international students USA"},
    {"title": "Renters Insurance for Students — Is It Worth It?", "category": "Insurance", "keywords": "renters insurance international students"},
    {"title": "Travel Insurance When Visiting Home on F-1 Visa", "category": "Insurance", "keywords": "travel insurance F-1 students visiting home"},
    {"title": "Health Insurance on OPT and STEM OPT Explained", "category": "Insurance", "keywords": "health insurance OPT visa USA"},
    # Banking
    {"title": "How to Open a Bank Account in the USA as an F-1 Student", "category": "Banking", "keywords": "bank account F-1 student USA"},
    {"title": "Best Credit Cards for International Students with No Credit History", "category": "Banking", "keywords": "credit cards international students no credit history"},
    {"title": "How to Build a Credit Score From Zero in the USA", "category": "Banking", "keywords": "build credit score international student USA"},
    {"title": "Cheapest Ways to Send Money Home from the USA", "category": "Banking", "keywords": "send money home cheapest way USA"},
    {"title": "How to File Taxes as an F-1 International Student", "category": "Banking", "keywords": "tax filing F-1 student USA"},
    # Visa & OPT
    {"title": "OPT Application Step by Step Guide 2026", "category": "Visa & OPT", "keywords": "OPT application guide F-1 students 2026"},
    {"title": "STEM OPT Extension — Complete 24 Month Guide", "category": "Visa & OPT", "keywords": "STEM OPT extension guide"},
    {"title": "H-1B Visa Lottery Explained Simply for F-1 Students", "category": "Visa & OPT", "keywords": "H-1B visa lottery F-1 students"},
    {"title": "How to Maintain F-1 Status — What Not to Do", "category": "Visa & OPT", "keywords": "maintain F-1 status rules"},
    {"title": "CPT vs OPT — What Is the Difference?", "category": "Visa & OPT", "keywords": "CPT vs OPT difference F-1 students"},
    # Housing
    {"title": "How to Find an Apartment as an International Student in the USA", "category": "Housing", "keywords": "apartment international student USA"},
    {"title": "Student Housing Guide — What to Check Before Signing a Lease", "category": "Housing", "keywords": "student housing lease signing guide USA"},
    {"title": "Best Cities in the USA for International Students", "category": "Housing", "keywords": "best cities international students USA"},
    {"title": "Cost of Living in Phoenix Arizona for Students", "category": "Housing", "keywords": "cost of living Phoenix Arizona students"},
    {"title": "How to Find a Roommate as an International Student", "category": "Housing", "keywords": "find roommate international student USA"},
    # Jobs & Career
    {"title": "How to Get an Internship in the USA on F-1 Visa", "category": "Jobs", "keywords": "internship USA F-1 visa students"},
    {"title": "How to Write a US-Style Resume as an International Student", "category": "Jobs", "keywords": "US resume international student"},
    {"title": "LinkedIn Tips for International Students in the USA", "category": "Jobs", "keywords": "LinkedIn tips international students USA"},
    {"title": "Best Job Boards for International Students in the USA", "category": "Jobs", "keywords": "job boards international students USA"},
    {"title": "How to Negotiate Salary in the USA as an International Student", "category": "Jobs", "keywords": "salary negotiation international student USA"},
    # City Guides
    {"title": "Phoenix Arizona — Complete Guide for International Students", "category": "City Guides", "keywords": "Phoenix Arizona international students guide"},
    {"title": "New York City Guide for International Students", "category": "City Guides", "keywords": "New York City international students guide"},
    {"title": "Boston Guide for International Students", "category": "City Guides", "keywords": "Boston international students guide"},
    {"title": "Austin Texas Guide for International Students", "category": "City Guides", "keywords": "Austin Texas international students guide"},
    {"title": "Seattle Guide for International Students", "category": "City Guides", "keywords": "Seattle international students guide"},
    # Daily Life
    {"title": "How to Get a US Driver's License on F-1 Visa", "category": "Daily Life", "keywords": "US driver license F-1 visa international student"},
    {"title": "Getting a Social Security Number as an F-1 Student", "category": "Daily Life", "keywords": "social security number F-1 student"},
    {"title": "Best Apps for International Students in the USA", "category": "Daily Life", "keywords": "best apps international students USA"},
    {"title": "How to Get from the Airport to Your University on Arrival", "category": "Daily Life", "keywords": "airport to university international student USA"},
    {"title": "Mental Health Resources for International Students in the USA", "category": "Daily Life", "keywords": "mental health international students USA"},
]


def slugify(text: str) -> str:
    """Convert title to URL-friendly slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:80]


def get_used_topics() -> list:
    """Fetch already published article slugs from Supabase."""
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/articles?select=slug",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            return [row["slug"] for row in resp.json()]
    except Exception as e:
        print(f"⚠️  Could not fetch used topics: {e}")
    return []


def pick_topic(used_slugs: list) -> dict:
    """Pick a topic that hasn't been published yet."""
    available = [t for t in TOPICS if slugify(t["title"]) not in used_slugs]
    if not available:
        print("✅ All topics used — reshuffling...")
        available = TOPICS
    return random.choice(available)


def write_article(topic: dict) -> dict:
    """Use Claude API to write a full SEO article."""
    print(f"✍️  Writing article: {topic['title']}...")

    prompt = f"""You are writing for "YourGuideInUSA", a helpful website for international students and newcomers settling in the United States.

Do NOT write generic SEO filler. Do NOT keyword-stuff. Write original, people-first content that reads like honest advice from someone who has actually been through the process.

Topic: {topic['title']}
Target keyword: {topic['keywords']}
Category: {topic['category']}

Accuracy rules:
- Do not invent laws, dates, prices, deadlines, or official form names.
- For immigration, legal, financial, or health claims, use cautious language (e.g. "typically", "check with your DSO").
- If a detail changes often, tell the reader what to verify rather than stating it as fact.

Writing rules:
- Length: 1,200–1,500 words
- Tone: Direct and warm — like advice from a friend who has been through it, not a corporate blog
- Structure: ## for main headings, ### for subheadings
- Include: specific practical steps, real cost ranges where known, a short FAQ at the end
- Vary sentence length. Mix short punchy sentences with longer ones. Avoid lists of 7+ bullet points.
- Write in plain markdown (no code blocks, no HTML)

At the very end (after the article), add:
---META---
EXCERPT: (2 sentence summary under 160 characters)
READ_TIME: (e.g. "8 min read")
---END---

Write the full article now:"""

    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": "claude-sonnet-4-6",
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=120,
    )

    if response.status_code != 200:
        raise Exception(f"Claude API error: {response.status_code} — {response.text}")

    full_text = response.json()["content"][0]["text"]

    # Parse meta section
    excerpt = ""
    read_time = "7 min read"
    content = full_text

    if "---META---" in full_text:
        parts = full_text.split("---META---")
        content = parts[0].strip()
        meta_section = parts[1].split("---END---")[0] if "---END---" in parts[1] else parts[1]
        for line in meta_section.strip().split("\n"):
            if line.startswith("EXCERPT:"):
                excerpt = line.replace("EXCERPT:", "").strip()
            elif line.startswith("READ_TIME:"):
                read_time = line.replace("READ_TIME:", "").strip()

    if not excerpt:
        # Fallback: use first paragraph
        lines = [l.strip() for l in content.split("\n") if l.strip() and not l.startswith("#")]
        excerpt = lines[0][:200] if lines else topic["title"]

    print(f"✅ Article written ({len(content)} chars)")
    return {"content": content, "excerpt": excerpt, "read_time": read_time}


def fetch_image(keywords: str) -> str:
    """Fetch a relevant image from Pexels API."""
    print(f"🖼️  Fetching image for: {keywords}...")
    try:
        resp = requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": keywords, "per_page": 5, "orientation": "landscape"},
            timeout=10,
        )
        if resp.status_code == 200:
            photos = resp.json().get("photos", [])
            if photos:
                photo = random.choice(photos)
                url = photo["src"]["large"]
                print(f"✅ Image found: {url[:50]}...")
                return url
    except Exception as e:
        print(f"⚠️  Pexels error: {e}")

    print(f"⚠️  No image found, skipping")
    return ""


def publish_to_supabase(article_data: dict) -> bool:
    """Insert the article into Supabase."""
    print(f"📤 Publishing to Supabase...")

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/articles",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=article_data,
        timeout=15,
    )

    if resp.status_code in (200, 201):
        print(f"✅ Published: {article_data['title']}")
        return True
    else:
        print(f"❌ Supabase error: {resp.status_code} — {resp.text}")
        return False


def run():
    """Main function — pick topic, write article, fetch image, publish."""
    print("\n" + "="*50)
    print(f"🚀 Auto-blog starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50 + "\n")

    # Validate keys
    missing = []
    if not ANTHROPIC_API_KEY:    missing.append("ANTHROPIC_API_KEY")
    if not PEXELS_API_KEY:       missing.append("PEXELS_API_KEY")
    if not SUPABASE_URL:         missing.append("NEXT_PUBLIC_SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY: missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        return

    # Pick unused topic
    used_slugs = get_used_topics()
    print(f"📚 {len(used_slugs)} articles already published")

    topic = pick_topic(used_slugs)
    slug  = slugify(topic["title"])
    print(f"📝 Chosen topic: {topic['title']}")

    # Write article with Claude
    try:
        article = write_article(topic)
    except Exception as e:
        print(f"❌ Writing failed: {e}")
        return

    # Fetch image
    image_url = fetch_image(topic["keywords"])

    # Build article data
    article_data = {
        "title":        topic["title"],
        "slug":         slug,
        "excerpt":      article["excerpt"],
        "content":      article["content"],
        "category":     topic["category"],
        "image_url":    image_url,
        "read_time":    article["read_time"],
        "published_at": datetime.utcnow().isoformat(),
    }

    # Publish
    success = publish_to_supabase(article_data)

    if success:
        print(f"\n🎉 Done! Article live at: yourguideinusa.com/blog/{slug}")
    else:
        print(f"\n❌ Failed to publish article")

    print("\n" + "="*50 + "\n")


if __name__ == "__main__":
    run()
