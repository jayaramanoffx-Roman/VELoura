import urllib.request

html = urllib.request.urlopen('http://localhost:8080/').read().decode('utf-8')
idx = html.find('id="reviews"')
print(html[idx:idx+500])

js = urllib.request.urlopen('http://localhost:8080/app.js').read().decode('utf-8')
j_idx = js.find('reviewsMarqueeTrack')
print('In app.js:', js[j_idx-20:j_idx+120])
