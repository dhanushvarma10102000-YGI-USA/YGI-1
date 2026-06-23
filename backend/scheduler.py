"""
Scheduler — runs autoblog every evening at 7:00 PM automatically.
Keep this running on Railway.app or any server.
"""

import schedule
import time
from datetime import datetime
from autoblog import run

def job():
    print(f"\n⏰ Scheduled run triggered at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    run()

# Schedule every day at 7:00 PM
schedule.every().day.at("19:00").do(job)

print("🕐 Scheduler started — will publish one article every evening at 7:00 PM")
print("   Press Ctrl+C to stop\n")

# Uncomment below to run one article immediately on first startup:
# run()

while True:
    schedule.run_pending()
    time.sleep(60)
