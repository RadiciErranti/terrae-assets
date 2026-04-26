name: Aggiorna feed Substack

on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scarica RSS Substack
        run: |
          curl -s -L \
            -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
            -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
            -H "Accept-Language: it-IT,it;q=0.9,en;q=0.8" \
            -H "Cache-Control: no-cache" \
            "https://terraefilmfest.substack.com/feed" \
            -o raw-feed.xml
          echo "Primi 200 caratteri del file scaricato:"
          head -c 200 raw-feed.xml

      - name: Converti RSS in JSON
        run: python3 filter.py

      - name: Commit e push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add substack-feed.json
          git diff --cached --quiet || git commit -m "chore: aggiorna feed Substack"
          git push
