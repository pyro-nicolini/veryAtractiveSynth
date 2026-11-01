/** WAV PCM fallback for phone/recorder WAV that decodeAudioData may reject.
    Handles RIFF chunk metadata, PCM 8/16/24/32-bit, IEEE float 32/64-bit,
    and WAVE_FORMAT_EXTENSIBLE with PCM/float subformats.
    No network, no codec binaries. */
export function isWav(data){
  const b=data instanceof Uint8Array?data:new Uint8Array(data);
  return b.length>=12&&String.fromCharCode(...b.subarray(0,4))==='RIFF'&&
    String.fromCharCode(...b.subarray(8,12))==='WAVE';
}
function readTag(bytes,at){return String.fromCharCode(bytes[at],bytes[at+1],bytes[at+2],bytes[at+3]);}
export function decodeWav(data,ctx){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  if(!isWav(bytes))throw Error('No es un WAV RIFF');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<44)throw Error('WAV incompleto');
  const announced=view.getUint32(4,true);
  if(announced+8>bytes.length)throw Error('WAV truncado');
  let at=12,format=null,audio=null;
  while(at+8<=bytes.length){
    const chunk=readTag(bytes,at),length=view.getUint32(at+4,true);
    const from=at+8,to=from+length;
    if(to>bytes.length)throw Error('Chunk de audio incompleto');
    if(chunk==='fmt '){
      if(length<16)throw Error('Formato WAV incompleto');
      let code=view.getUint16(from,true);
      const channels=view.getUint16(from+2,true),sampleRate=view.getUint32(from+4,true);
      const blockAlign=view.getUint16(from+12,true),bits=view.getUint16(from+14,true);
      if(code===65534&&length>=40)code=view.getUint16(from+24,true);
      format={code,channels,sampleRate,blockAlign,bits};
    }else if(chunk==='data'&&!audio){
      audio={from,length};
    }
    at=to+(length%2);
  }
  if(!format||!audio)throw Error('WAV sin formato o datos');
  const {code,channels,sampleRate,blockAlign,bits}=format;
  if(![1,2].includes(channels)||sampleRate<8000||sampleRate>192000)
    throw Error('Canales o frecuencia WAV no admitidos');
  if(!((code===1&&[8,16,24,32].includes(bits))||(code===3&&[32,64].includes(bits))))
    throw Error('WAV con codificación no admitida');
  const bytesPerSample=bits/8;
  if(blockAlign!==channels*bytesPerSample||audio.length%blockAlign!==0)
    throw Error('WAV dañado o con muestras incompletas');
  const frames=audio.length/blockAlign;
  if(!frames||frames>sampleRate*1200)throw Error('Duración WAV inválida o excesiva');
  const result=ctx.createBuffer(channels,frames,sampleRate);
  const out=Array.from({length:channels},(_,c)=>result.getChannelData(c));
  let read=audio.from;
  for(let i=0;i<frames;i++){
    for(let c=0;c<channels;c++){
      let value;
      if(code===3){
        value=bits===32?view.getFloat32(read,true):view.getFloat64(read,true);
      }else if(bits===8)value=(view.getUint8(read)-128)/128;
      else if(bits===16)value=view.getInt16(read,true)/32768;
      else if(bits===24){
        let x=view.getUint8(read)|(view.getUint8(read+1)<<8)|(view.getUint8(read+2)<<16);
        if(x&0x800000)x|=0xff000000;
        value=x/8388608;
      }else value=view.getInt32(read,true)/2147483648;
      out[c][i]=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
      read+=bytesPerSample;
    }
  }
  return result;
}

/** Decode uncompressed Apple Core Audio Format (CAF) files.
    Supports common interleaved LPCM only; AAC/ALAC/Opus in CAF need a codec.
    This is a safe fallback, not a universal media transcoder. */
export function isCaf(data){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  return bytes.length>=8&&readTag(bytes,0)==='caff';
}
export function decodeCaf(data,ctx){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  if(!isCaf(bytes))throw Error('No es un archivo CAF');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint16(4,false)!==1)throw Error('Versión CAF no admitida');
  let format=null,audio=null,at=8;
  while(at+12<=bytes.length){
    const name=readTag(bytes,at),sizeBig=view.getBigInt64(at+4,false);
    const start=at+12;
    // CAF -1 means unknown data length; use actual remaining file for data.
    const size=sizeBig===-1n&&name==='data'?bytes.length-start:Number(sizeBig);
    if(size<0||!Number.isSafeInteger(size)||start+size>bytes.length)throw Error('Chunk CAF inválido');
    if(name==='desc'){
      if(size<32)throw Error('Descripción CAF incompleta');
      const sampleRate=view.getFloat64(start,false),codec=readTag(bytes,start+8);
      const flags=view.getUint32(start+12,false),packetBytes=view.getUint32(start+16,false),
        framesPerPacket=view.getUint32(start+20,false),channels=view.getUint32(start+24,false),
        bits=view.getUint32(start+28,false);
      format={sampleRate,codec,flags,packetBytes,framesPerPacket,channels,bits};
    }else if(name==='data'&&!audio){
      if(size<4)throw Error('Datos CAF incompletos');
      audio={start:start+4,length:size-4};
    }
    at=start+size;
  }
  if(!format||!audio)throw Error('CAF sin descripción o sonido');
  const {sampleRate,codec,flags,packetBytes,framesPerPacket,channels,bits}=format;
  if(codec!=='lpcm')throw Error('Este CAF contiene audio comprimido no admitido');
  const isFloat=(flags&1)!==0,le=(flags&2)!==0,signed=(flags&4)!==0,packed=(flags&8)!==0,nonInterleaved=(flags&32)!==0;
  if(nonInterleaved||!packed||framesPerPacket!==1||![1,2].includes(channels)
     ||sampleRate<8000||sampleRate>192000||!Number.isInteger(sampleRate))
    throw Error('Formato PCM CAF no admitido');
  if(!((isFloat&&[32,64].includes(bits))||(!isFloat&&[8,16,24,32].includes(bits))))
    throw Error('Profundidad PCM CAF no admitida');
  const bytesPerSample=bits/8,frameBytes=bytesPerSample*channels;
  if(packetBytes!==frameBytes||audio.length%frameBytes!==0)throw Error('Muestras CAF incompletas');
  const frames=audio.length/frameBytes;
  if(!frames||frames>sampleRate*1200)throw Error('Duración CAF inválida');
  const outBuffer=ctx.createBuffer(channels,frames,sampleRate),
    outputs=Array.from({length:channels},(_,i)=>outBuffer.getChannelData(i));
  let atSample=audio.start;
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){
    let value;
    if(isFloat){
      value=bits===32?view.getFloat32(atSample,le):view.getFloat64(atSample,le);
    }else if(bits===8){
      const v=view.getUint8(atSample);value=signed?(v>127?v-256:v)/128:(v-128)/128;
    }else if(bits===16){
      value=signed?view.getInt16(atSample,le)/32768:(view.getUint16(atSample,le)-32768)/32768;
    }else if(bits===24){
      const v=le?(bytes[atSample]|bytes[atSample+1]<<8|bytes[atSample+2]<<16):
        (bytes[atSample]<<16|bytes[atSample+1]<<8|bytes[atSample+2]);
      const sample=signed&&v&0x800000?v|0xff000000:v;
      value=signed?sample/8388608:(v-8388608)/8388608;
    }else{
      value=signed?view.getInt32(atSample,le)/2147483648:
        (view.getUint32(atSample,le)-2147483648)/2147483648;
    }
    outputs[c][i]=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
    atSample+=bytesPerSample;
  }
  return outBuffer;
}
