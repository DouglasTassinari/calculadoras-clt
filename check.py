import re
from collections import Counter

html = open("index.html", encoding="utf-8").read()
cjs  = open("assets/js/consent.js", encoding="utf-8").read()

print("window.dataLayer no HTML:", html.count("window.dataLayer"))
print("function gtag() no HTML:", html.count("function gtag()"))
print("gtag consent default no HTML:", html.count("gtag('consent','default'"))
print("style.css refs:", html.count("style.css"), "(esperado 2: preload + noscript)")
print("<section> abre/fecha:", html.count("<section"), "/", html.count("</section>"))
print("<nav> abre/fecha:", html.count("<nav"), "/", html.count("</nav>"))
print("<picture> abre/fecha:", html.count("<picture>"), "/", html.count("</picture>"))
print("<main> abre/fecha:", html.count("<main"), "/", html.count("</main>"))
print("<header> abre/fecha:", html.count("<header"), "/", html.count("</header>"))
print("<footer> abre/fecha:", html.count("<footer"), "/", html.count("</footer>"))

ids = re.findall(r'id="([^"]+)"', html)
dups = {k:v for k,v in Counter(ids).items() if v>1}
print("IDs duplicados:", dups or "nenhum")

print("\nconsent.js _jbLoadAnalytics refs:", cjs.count("_jbLoadAnalytics"))
print("consent.js G-XXXXXXXXXX presente:", "G-XXXXXXXXXX" in cjs)
print("consent.js window.dataLayer:", cjs.count("window.dataLayer"), "(esperado 0)")
print("consent.js function gtag():", cjs.count("function gtag()"), "(esperado 0)")
