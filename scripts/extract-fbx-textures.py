import struct,json
from pathlib import Path
for label,filename in [('street','public/assets/user-skins/Fast Run.fbx'),('classic','public/assets/user-character/Running.fbx')]:
 b=Path(filename).read_bytes();wide=struct.unpack_from('<I',b,23)[0]>=7500;h=25 if wide else 13;fmt='<QQQB' if wide else '<IIIB';images=[]
 def node(start):
  end,count,length,n=struct.unpack_from(fmt,b,start)
  if not end:return None,start+h
  name=b[start+h:start+h+n];pos=start+h+n;props=[]
  for i in range(count):
   begin=pos;t=chr(b[pos]);pos+=1
   if t in 'YCFDIL':pos+={'Y':2,'C':1,'F':4,'D':8,'I':4,'L':8}[t]
   elif t in 'fdilbc':size,enc,packed=struct.unpack_from('<III',b,pos);pos+=12+packed
   elif t in 'RS':size=struct.unpack_from('<I',b,pos)[0];pos+=4+size
   else:raise ValueError(t)
   value=b[begin:pos]
   if t in 'RS' and value[5:13]==b'\x89PNG\r\n\x1a\n':
    dest=Path('.asset-work',f'{label}-{len(images)}.png');dest.write_bytes(value[5:]);images.append(str(dest))
  while pos<end-h:
   child,pos=node(pos)
   if child is None:break
  return name,end
 pos=27
 while True:
  name,pos=node(pos)
  if name is None:break
 print(label,images)
