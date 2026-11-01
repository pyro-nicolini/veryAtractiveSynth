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
 {id:'digital',name:'Digital extremo',icon:'⚡',shift:-12,drive:80,brightness:89,warmth:10,autotune:98,retune:100}
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
