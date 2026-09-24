"""Consistent SQLite snapshot before a server update; never copies a live WAL file."""
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3

root = Path('/home/malik/apps/adspace')
source = root / 'data' / 'adspace.sqlite'
if not source.is_file():
    raise SystemExit('Existing pilot database not found')
target = root / 'backups' / ('adspace-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.sqlite')
target.parent.mkdir(mode=0o700, exist_ok=True)
os.close(os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600))
src = sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)
dst = sqlite3.connect(target)
try:
    src.backup(dst)
    if dst.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise SystemExit('Backup integrity check failed')
finally:
    src.close()
    dst.close()
print('Database snapshot verified:', target)
