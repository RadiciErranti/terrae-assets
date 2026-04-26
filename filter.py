import json

with open("raw-feed.json", "r") as f:
    posts = json.load(f)

filtered = [
    p for p in posts
    if any(
        t.get("name", "").lower() == "news"
        for t in (p.get("postTags") or [])
    )
]

with open("substack-feed.json", "w") as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print(f"Filtrati {len(filtered)} post con tag 'news' su {len(posts)} totali.")
