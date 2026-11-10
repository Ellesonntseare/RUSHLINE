import struct
from pathlib import Path
for label,filename in [('street','public/assets/user-skins/Fast Run.fbx'),('classic','public/assets/user-character/Running.fbx')]:
 b=Path(filename).read_bytes();wide=struct.unpack_from('<I',b,23)[0]>=7500;h=25 if wide else 13;fmt='<QQQB' if wide else '<IIIB';image=0
 def parse(start):
  global image
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
    small=Path('.asset-work',f'{label}-{image}.png.small.png').read_bytes();image+=1
    if len(small)<len(value)-5:value=value[:1]+struct.pack('<I',len(small))+small
   props.append(value)
  children=[]
  while pos<end-h:
   child,pos=parse(pos)
   if child is None:break
   children.append(child)
  suffix=b[pos:end]
  return (name,props,children,suffix),end
 def encode(node,start):
  name,props,children,suffix=node;properties=b''.join(props);pos=start+h+len(name)+len(properties);out=[]
  for child in children:
   block=encode(child,pos);out.append(block);pos+=len(block)
  end=pos+len(suffix)
  return struct.pack(fmt,end,len(props),len(properties),len(name))+name+properties+b''.join(out)+suffix
 nodes=[];pos=27
 while True:
  node,end=parse(pos)
  if node is None:break
  nodes.append(node);pos=end
 out=bytearray(b[:27])
 for node in nodes:out.extend(encode(node,len(out)))
 out.extend(b[pos:]);target=Path('public/assets/optimized');target.mkdir(exist_ok=True);dest=target/f'{label}.fbx';dest.write_bytes(out);print(label,len(b),'->',len(out))
