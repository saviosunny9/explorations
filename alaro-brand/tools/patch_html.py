import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
anchor = 'data-precedence="next"/>'
assert anchor in s
inject = ('<link rel="preconnect" href="https://fonts.googleapis.com"/>'
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>'
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500&amp;display=swap"/>'
          '<link rel="stylesheet" href="./brand/alaro-brand.css"/>')
s = s.replace(anchor, anchor + inject, 1)
s = s.replace('<meta name="theme-color" content="#fafafa"/>', '<meta name="theme-color" content="#063a33"/>')
open(dst, 'w').write(s)
