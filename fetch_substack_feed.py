def extract_img(html):
    import re
    pattern = r'<img[^>]+src=["']((?:[^"']*)["']'
    match = re.search(pattern, html)
    if match:
        return match.group(1)
    return None
