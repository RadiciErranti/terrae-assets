import xml.etree.ElementTree as ET
import json
import re

def clean_html(html):
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:200] + "..." if len(text) > 200 else text

def first_image(html):
    if not html:
        return ""
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return m.group(1) if m else ""

def format_date(date_str):
    if not date_str:
        return ""
    months = {"Jan":"01","Feb":"02","Mar":"03","Apr":"04","May":"05","Jun":"06",
               "Jul":"07","Aug":"08","Sep":"09","Oct":"10","Nov":"11","Dec":"12"}
    parts = date_str.strip().split()
    if len(parts) >= 4:
        day = parts[1].zfill(2)
        mon = months.get(parts[2], "01")
        year = parts[3]
        return day + " · " + mon + " · " + year
    return date_str

tree = ET.parse("raw-feed.xml")
root = tree.getroot()
channel = root.find("channel")
items = channel.findall("item")

posts = []
for item in items:
    categories = [c.text.strip().lower() for c in item.findall("category") if c.text]
    if "news" not in categories:
        continue
    title    = (item.findtext("title") or "").strip()
    link     = (item.findtext("link") or "").strip()
    pub_date = item.findtext("pubDate") or ""
    content  = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or item.findtext("description") or ""
    image    = first_image(content)
    excerpt  = clean_html(content)
    posts.append({
        "title": title,
        "link": link,
        "pub_date": format_date(pub_date),
        "cover_image": image,
        "subtitle": excerpt,
        "tag": "NEWS",
    })

with open("substack-feed.json", "w") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print("Salvati " + str(len(posts)) + " post con tag news.")
