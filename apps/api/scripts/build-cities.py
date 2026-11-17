"""
Builds assets/places/cities.json.gz from GeoNames cities1000.txt (https://download.geonames.org/export/dump/,
CC BY 4.0): every place of 1000+ people in the euro area, with the names people type (the local spelling
first for LV and LT, where GeoNames writes "Riga"; Cyrillic and other common forms for search).
Usage: python3 -I scripts/build-cities.py path/to/cities1000.txt
"""
import gzip, json, re, sys, unicodedata

L = {'LV': 'āēīūģķļņšžč', 'LT': 'ąčęėįšųūž', 'EE': 'õäöüšž', 'FI': 'äöå', 'DE': 'äöüß', 'AT': 'äöüß', 'LU': 'äöüéè',
     'FR': 'éèêàçôîûëïüœ', 'BE': 'éèêàçôëïü', 'NL': 'ëïéè', 'IT': 'àèéìòù', 'ES': 'áéíóúñü', 'PT': 'áâãàçéêíóôõú',
     'SK': 'áäčďéíĺľňóôŕšťúýž', 'SI': 'čšž', 'HR': 'čćđšž', 'MT': 'ċġħż', 'IE': 'áéíóú', 'GR': '', 'CY': '', 'BG': ''}
LOCAL_DISPLAY = {'LV', 'LT'}
ok = re.compile(r"^[\w .'’()\-]+$")

def fold(s): return ''.join(ch for ch in unicodedata.normalize('NFD', s) if not unicodedata.combining(ch)).lower()

def scripts(s):
    out = set()
    for ch in s:
        if ch.isalpha():
            n = unicodedata.name(ch, '')
            out.add('L' if n.startswith('LATIN') else 'C' if n.startswith('CYRILLIC') else 'G' if n.startswith('GREEK') else 'X')
    return out

out = {c: [] for c in L}
for line in open(sys.argv[1], encoding='utf-8'):
    f = line.rstrip('\n').split('\t'); c = f[8]
    if c not in out or f[6] != 'P': continue
    name = f[1]; cand = []
    for a in f[3].split(','):
        a = a.strip()
        if not a or a == name or len(a) > 40 or not ok.match(a) or any(ch.isdigit() for ch in a) or (a.isupper() and len(a) <= 4): continue
        sc = scripts(a)
        if 'X' in sc or not sc: continue
        if a not in cand: cand.append(a)
    letters = set(L[c]); haslocal = lambda a: any(ch in letters for ch in a.lower())
    same = [a for a in cand if fold(a) == fold(name) and haslocal(a)]
    near = [a for a in cand if haslocal(a) and fold(a)[:3] == fold(name)[:3] and ' ' not in a and a not in same][:2]
    cyr = [a for a in cand if scripts(a) == {'C'}][:2]
    grk = [a for a in cand if scripts(a) == {'G'}][:1] if c in ('GR', 'CY') else []
    lat = [a for a in cand if scripts(a) == {'L'} and a not in same and a not in near][:3]
    display = same[0] if (c in LOCAL_DISPLAY and same) else name
    alts = [a for a in dict.fromkeys([name] + same[:1] + near + cyr + grk + lat) if a != display]
    out[c].append([display, alts, int(f[14] or 0), round(float(f[4]), 4), round(float(f[5]), 4)])
for c in L: out[c].sort(key=lambda r: -r[2])
data = json.dumps({'source': 'GeoNames cities1000 (https://www.geonames.org), CC BY 4.0', 'countries': out}, ensure_ascii=False, separators=(',', ':'))
open('assets/places/cities.json.gz', 'wb').write(gzip.compress(data.encode(), 9))
