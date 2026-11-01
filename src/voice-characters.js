/** Creative, intentionally stylized voice pitch/timbre profiles.
 * This is NOT formant-preserving identity/age/gender voice transformation.
 */
export const VOICE_CHARACTERS=Object.freeze([
 {id:'natural',name:'Mi voz',icon:'◎',shift:0,drive:0,brightness:55,warmth:25,autotune:0,retune:40},
 {id:'robot',name:'Robot',icon:'◈',shift:0,drive:20,brightness:75,warmth:10,autotune:100,retune:100},
 {id:'alien',name:'Marciano',icon:'✦',shift:5,drive:35,brightness:82,warmth:10,autotune:82,retune:93},
 {id:'monster',name:'Monstruo',icon:'♨',shift:-9,drive:57,brightness:18,warmth:84,autotune:26,retune:40},
 {id:'giant',name:'Gigante',icon:'◉',shift:-5,drive:28,brightness:27,warmth:79,autotune:16,retune:30},
 {id:'helium',name:'Helio agudo',icon:'✧',shift:8,drive:4,brightness:83,warmth:9,autotune:15,retune:48},
 {id:'tiny',name:'Personaje pequeño',icon:'♡',shift:6,drive:8,brightness:76,warmth:16,autotune:55,retune:82},
 {id:'storybook-f',name:'Voz aguda fantástica',icon:'✿',shift:5,drive:1,brightness:73,warmth:14,autotune:28,retune:60},
 {id:'storybook-m',name:'Voz grave fantástica',icon:'♟',shift:-5,drive:9,brightness:33,warmth:75,autotune:15,retune:38},
 {id:'storybook-child',name:'Niño de caricatura',icon:'☆',shift:7,drive:0,brightness:81,warmth:8,autotune:30,retune:60},
 {id:'goblin',name:'Duende travieso',icon:'☘',shift:4,drive:62,brightness:90,warmth:12,autotune:80,retune:92},
 {id:'digital',name:'Digital extremo',icon:'⚡',shift:-12,drive:80,brightness:89,warmth:10,autotune:98,retune:100},
 {id:'velvet',name:'Velvet suave',icon:'♥',shift:-1,drive:4,brightness:62,warmth:60,autotune:26,retune:42},
 {id:'fem-bright',name:'Femenina brillante · estilizada',icon:'✧',shift:5,drive:0,brightness:86,warmth:12,autotune:38,retune:58},
 {id:'fem-soft',name:'Femenina suave · estilizada',icon:'♡',shift:3,drive:0,brightness:70,warmth:22,autotune:18,retune:32},
 {id:'masc-baritone',name:'Masculina barítono · estilizada',icon:'◉',shift:-5,drive:5,brightness:32,warmth:82,autotune:15,retune:35},
 {id:'masc-deep',name:'Masculina profunda · estilizada',icon:'◆',shift:-8,drive:14,brightness:22,warmth:88,autotune:24,retune:52},
 {id:'bronx-rap',name:'Rap urbano · áspero',icon:'♛',shift:-2,drive:30,brightness:49,warmth:69,autotune:15,retune:35},
 {id:'cartoon-duck',name:'Pato de caricatura',icon:'☼',shift:10,drive:30,brightness:95,warmth:0,autotune:80,retune:100},
 {id:'cartoon-villain',name:'Villana animada',icon:'♠',shift:-7,drive:22,brightness:31,warmth:87,autotune:58,retune:72},
 {id:'pixie',name:'Hada digital',icon:'❋',shift:9,drive:3,brightness:90,warmth:6,autotune:94,retune:92},
 {id:'radio-host',name:'Locutor de medianoche',icon:'◍',shift:-3,drive:15,brightness:38,warmth:76,autotune:0,retune:40}
]);
export function applyVoiceCharacter(track,id){
 const character=VOICE_CHARACTERS.find(c=>c.id===id);if(!character)throw Error('Personaje desconocido');
 for(const key of ['drive','brightness','warmth','autotune','retune'])track[key]=character[key];
 track.pitchShift=character.shift;track.voiceCharacter=id;track.bypassEffects=false;
 track.fxBypass={...track.fxBypass,tune:false,drive:false,eq:false};
 return character;
}
export function characterCoordinates(track,x,y){
 const nx=Math.max(-1,Math.min(1,Number(x)||0)),ny=Math.max(-1,Math.min(1,Number(y)||0));
 track.pitchShift=Math.round(nx*12*10)/10;
 track.drive=Math.round((ny+1)*50);
 track.voiceCharacter='custom';
 return {shift:track.pitchShift,drive:track.drive};
}
