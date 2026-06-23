"""
Bulk publish script — runs autoblog multiple times to fill the blog with articles.
Run this once to generate all initial articles.
"""
import time
from autoblog import run, get_used_topics, pick_topic, slugify, write_article, fetch_image, publish_to_supabase
from datetime import datetime

def bulk_run(count: int = 10):
    print(f"\n{'='*50}")
    print(f"📚 Bulk publishing {count} articles")
    print(f"{'='*50}\n")
    
    success = 0
    failed  = 0
    
    for i in range(count):
        print(f"\n--- Article {i+1} of {count} ---")
        try:
            run()
            success += 1
            # Wait 8 seconds between articles to avoid rate limits
            if i < count - 1:
                print(f"⏳ Waiting 8 seconds before next article...")
                time.sleep(8)
        except Exception as e:
            print(f"❌ Failed: {e}")
            failed += 1
            time.sleep(5)
    
    print(f"\n{'='*50}")
    print(f"✅ Done! {success} published, {failed} failed")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    bulk_run(count=15)
