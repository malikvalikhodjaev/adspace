from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = '    - service: http_status:404'
if text.count(marker) != 1:
    raise SystemExit('Expected one final 404 route; configuration left unchanged')
text = text.replace(marker, '    - hostname: maydonlar.fom-analytics.uz\n      service: http://127.0.0.1:3002\n' + marker)
path.write_text(text)
