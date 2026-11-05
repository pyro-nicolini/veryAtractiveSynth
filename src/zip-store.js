/* Local uncompressed ZIP writer/reader, no dependencies and no network.
   Entries are stored, not compressed, so WAV audio stays bit-exact. */
const enc=new TextEncoder(),dec=new TextDecoder();
const table=Uint32Array.from({length:256},(_,i)=>{
  let x=i;for(let j=0;j<8;j++)x=(x&1)?(0xedb88320^(x>>>1)):(x>>>1);return x>>>0;
});
export function crc32(bytes){
  let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function header(size){return new Uint8Array(size);}
function write16(view,at,value){view.setUint16(at,value,true);}
function write32(view,at,value){view.setUint32(at,value,true);}
function ensureEntryName(name){
  if(!name||name.startsWith('/')||name.includes('..')||name.includes('\\'))throw Error('Nombre de archivo ZIP inseguro');
  return name;
}
export async function zipStore(entries){
  if(!entries.length)throw Error('No hay archivos para empaquetar');
  if(entries.length>1000)throw Error('Demasiados archivos de audio para guardar');
  const parts=[],central=[];let offset=0,centralLength=0;
  for(const entry of entries){
    const name=enc.encode(ensureEntryName(entry.name)),bytes=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());
    if(name.length>65535||bytes.length>=0xffffffff)throw Error('Archivo demasiado grande');
    const crc=crc32(bytes),local=header(30+name.length),view=new DataView(local.buffer);
    write32(view,0,0x04034b50);write16(view,4,20);write16(view,6,0);write16(view,8,0);
    write32(view,14,crc);write32(view,18,bytes.length);write32(view,22,bytes.length);write16(view,26,name.length);
    local.set(name,30);parts.push(local,bytes);
    const dir=header(46+name.length),dv=new DataView(dir.buffer);
    write32(dv,0,0x02014b50);write16(dv,4,20);write16(dv,6,20);write16(dv,8,0);write16(dv,10,0);
    write32(dv,16,crc);write32(dv,20,bytes.length);write32(dv,24,bytes.length);
    write16(dv,28,name.length);write32(dv,42,offset);dir.set(name,46);
    central.push(dir);centralLength+=dir.length;offset+=local.length+bytes.length;
    if(offset>=0xffffffff)throw Error('Proyecto ZIP demasiado grande (máximo 4 GB)');
  }
  const end=header(22),ev=new DataView(end.buffer);
  write32(ev,0,0x06054b50);write16(ev,8,central.length);write16(ev,10,central.length);
  write32(ev,12,centralLength);write32(ev,16,offset);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
export async function unzipStore(file,maxSize=550*1024*1024){
  if(file.size>maxSize)throw Error('El proyecto supera el límite de tamaño');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  const files=new Map();let cursor=0;
  while(cursor+4<=bytes.length){
    const sig=view.getUint32(cursor,true);
    if(sig===0x02014b50||sig===0x06054b50)break;
    if(sig!==0x04034b50)throw Error('Este archivo no es un proyecto ZIP válido');
    if(cursor+30>bytes.length)throw Error('Archivo ZIP truncado');
    const flags=view.getUint16(cursor+6,true),method=view.getUint16(cursor+8,true);
    if(flags!==0||method!==0)throw Error('Este proyecto usa una compresión no admitida');
    const crc=view.getUint32(cursor+14,true),size=view.getUint32(cursor+18,true);
    const compressed=view.getUint32(cursor+22,true),len=view.getUint16(cursor+26,true),extra=view.getUint16(cursor+28,true);
    const start=cursor+30+len+extra,end=start+size;
    if(size!==compressed||end>bytes.length)throw Error('Archivo ZIP incompleto');
    const name=ensureEntryName(dec.decode(bytes.subarray(cursor+30,cursor+30+len)));
    const data=bytes.slice(start,end);
    if(crc32(data)!==crc)throw Error('El proyecto tiene datos dañados: '+name);
    if(files.has(name)||files.size>=1000)throw Error('Proyecto ZIP repetido o excesivo');
    files.set(name,data);
    cursor=end;
  }
  if(!files.size)throw Error('Proyecto vacío');
  return files;
}
