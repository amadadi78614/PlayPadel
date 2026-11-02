import os
P='/home/claude/padel3d/parts/'
r=lambda f: open(P+f).read()
js=r('a_data.js')+'\n'+r('a_roster.js')+'\n'+r('scene_chunk.js')+'\n'+r('scene_sponsors.js')+'\n'+r('scene_fx.js')+'\n'+r('b_players.js')+r('c_game.js')+r('e_drills.js')+r('g_online.js')+(lambda d: d[:d.rstrip().rfind('})();')])(r('d_ui.js'))+r('h_challenges.js')+'\n})();\n'
import hashlib
js=js.replace('__BUILD__', hashlib.sha1(js.encode()).hexdigest()[:7])
out=r('head.html')+r('body.html')+'\n<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>\n<script>\n'+js+'</script>\n'
open('/home/claude/padel3d/padel-doubles-3d.html','w').write(out); print(len(out))
