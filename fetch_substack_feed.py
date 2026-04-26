import feedparser
import json
import re
from datetime import datetime
from html.parser import HTMLParser


class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    
    def handle_data(self, data):
        self.text.append(data.strip())
    
    def get_text(self):
        return ' '.join(self.text)


def clean(html):
    """Extract plain text from HTML and limit to 200 characters."""
    if not html:
        return ""
    
    # Remove HTML tags
    t = re.sub(r"<[^>]+>", " ", html)
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()
    
    return t[:200] + "..." if len(t) > 200 else t

def extract_img(html):
    """Extract first image src from HTML."""
    if not html:
        return ""
    
    match = re.search(r'<img[^>]+src=["']([^"']+)["']', html, re.IGNORECASE)
    return match.group(1) if match else ""

def format_date(date_string):
    """Format date from RSS to GG · MM · AAAA format."""
    if not date_string:
        return ""
    
    try:
        # Parse RFC 2822 format used by RSS
        parsed_date = feedparser._parse_date(date_string)
        if parsed_date:
            dt = datetime(*parsed_date[:6])
            return dt.strftime("%d · %m · %Y")
    except:
        pass
    
    return date_string

def main():
    # Fetch the feed
    feed_url = "https://terraefilmfest.substack.com/feed"
    
    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return
    
    if feed.bozo:
        print(f"Warning: Feed parsing had issues: {feed.bozo_exception}")
    
    posts = []
    
    # Process each entry
    for entry in feed.entries:
        # Extract categories
        categories = []
        if hasattr(entry, 'tags'):
            categories = [tag.term.lower() for tag in entry.tags if hasattr(tag, 'term')]
        
        # Filter for 'news' category
        if "news" not in categories:
            continue
        
        # Extract content
        content = ""
        if hasattr(entry, 'content'):
            content = entry.content[0].value if entry.content else ""
        elif hasattr(entry, 'summary'):
            content = entry.summary
        
        # Build post object
        post = {
            "title": entry.get('title', '').strip(),
            "link": entry.get('link', '').strip(),
            "pub_date": format_date(entry.get('published', '')),
            "cover_image": extract_img(content),
            "subtitle": clean(content),
            "tag": "NEWS"
        }
        
        posts.append(post)
    
    # Write to JSON file
    try:
        with open("substack-feed.json", "w", encoding="utf-8") as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
        
        print(f"Successfully processed {len(posts)} posts with 'news' category")
        print(f"Saved to substack-feed.json")
    except Exception as e:
        print(f"Error writing JSON file: {e}")


if __name__ == "__main__":
    main()