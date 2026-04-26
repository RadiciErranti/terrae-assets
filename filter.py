import xml.etree.ElementTree as ET
import json
import re


def clean(html):
    if not html:
        return ""
    t = re.sub(r"<[^>]+>", " ", html)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:200] + "..." if len(t) > 200 else t


def img(html):
    if not html:
        return ""
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return m.group(1) if m else ""


def fmtdate(s):
    if not s:
        return ""
    months = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
    }
    p = s.strip().split()
    if len(p) >= 4:
        return p[1].zfill(2) + " · " + months.get(p[2], "01") + " · " + p[3]
    return s


tree = ET.parse("raw-feed.xml")
items = tree.getroot().find("channel").findall("item")

posts = []
for item in items:
    cats = [c.text.strip().lower() for c in item.findall("category") if c.text]
    if "news" not in cats:
        continue
    ns = "http://purl.org/rss/1.0/modules/content/"
    content = item.findtext("{" + ns + "}encoded") or item.findtext("description") or ""
    posts.append({
        "title": (item.findtext("title") or "").strip(),
        "link": (item.findtext("link") or "").strip(),
        "pub_date": fmtdate(item.findtext("pubDate") or ""),
        "cover_image": img(content),
        "subtitle": clean(content),
        "tag": "NEWS"
    })

with open("substack-feed.json", "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print("Post con tag news: " + str(len(posts)))
