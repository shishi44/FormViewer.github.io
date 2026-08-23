from pathlib import Path
import json, re, sys

root=Path(__file__).resolve().parents[1]
errors=[]

def check(condition, message):
    if not condition: errors.append(message)

sample=json.loads((root/'data/sampleResponses.json').read_text(encoding='utf-8'))
check(sample['count']==len(sample['responses']), 'sample count mismatch')
check(len(sample['responses'][1]['content'])>=3000, '3000+ character sample missing')
check(any('<script>alert(1)</script>' in x['content'] for x in sample['responses']), 'XSS sample missing')

required=[
 'index.html','editor.html','css/editor.css','js/editor.js','js/app.js',
 'js/api/googleFormsApi.js','js/services/responseService.js','gas/Code.gs'
]
for rel in required:
    check((root/rel).exists(),f'missing: {rel}')

for template in ['clean','paper','pop','radio']:
    css=root/f'templates/{template}/{template}.css'
    png=root/f'templates/{template}/preview.png'
    check(css.exists(),f'missing css: {template}')
    check(png.exists(),f'missing preview: {template}')
    if css.exists():
        text=css.read_text(encoding='utf-8')
        check('height:var(--content-height)' in text,f'content height variable missing: {template}')

js='\n'.join(p.read_text(encoding='utf-8') for p in (root/'js').rglob('*.js'))
check('innerHTML =' not in js and '.innerHTML=' not in js, 'innerHTML assignment detected')
check('insertAdjacentHTML' not in js, 'insertAdjacentHTML detected')
check('textContent' in (root/'js/utils/dom.js').read_text(encoding='utf-8'), 'textContent helper missing')

editor_css=(root/'css/editor.css').read_text(encoding='utf-8')
for token in ['overflow-y:auto','white-space:pre-wrap','overflow-wrap:anywhere']:
    check(token in editor_css,f'long text rule missing: {token}')

gas=(root/'gas/Code.gs').read_text(encoding='utf-8')
for header in ['お名前(ラジオネーム)','内容','REQUIRED_HEADER_MISSING','isValidCallback_']:
    check(header in gas,f'GAS requirement missing: {header}')

if errors:
    print('FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('Python project verification: OK')
