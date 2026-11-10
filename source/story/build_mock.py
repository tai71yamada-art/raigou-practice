# ストーリーモードADVのモックを、画像を埋め込んだ1つのHTMLにする：python3 source/story/build_mock.py
import base64, os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..')
def uri(p, mime):
    with open(os.path.join(SRC, p), 'rb') as f: return 'data:' + mime + ';base64,' + base64.b64encode(f.read()).decode()
html = open(os.path.join(HERE, 'adv_mock.html'), encoding='utf-8').read()
rep = {
  '{{IROHA}}': uri('assets/story/iroha/tachie.webp', 'image/webp'),
  '{{IROHA_CREST}}': uri('assets/story/iroha/crest.png', 'image/png'),
  '{{KURARA}}': uri('assets/chara/rakura/hero.webp', 'image/webp'),
  '{{KURARA_CREST}}': uri('assets/img/house/rakura.png', 'image/png'),
  '{{KV}}': uri('assets/img/key-visual.webp', 'image/webp'),
}
for k, v in rep.items(): html = html.replace(k, v)
out = os.path.join(SRC, '..', 'dist', 'adv_mock.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html) // 1024, 'KB')
