"""Assemble index.html à partir des sources de src/.
Usage : python3 src/build.py   (depuis la racine du dépôt)"""
import os,re,subprocess,sys
d=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(d,f),encoding='utf-8').read()
out=f"""{r('head.html')}<style>{r('style.css')}</style>
</head>
<body>
{r('body.html')}
<script>
{r('core.js')}
</script>
<script>
{r('music.js')}
</script>
<script>
{r('ui.js')}
</script>
</body>
</html>
"""
open(os.path.join(d,'..','index.html'),'w',encoding='utf-8').write(out)
print('index.html reconstruit')
