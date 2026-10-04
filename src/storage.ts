export type Save = { version: 1; sound: boolean; reduced: boolean; highScore: number; bestTime: number | null };
const defaults: Save = { version: 1, sound: true, reduced: false, highScore: 0, bestTime: null };
export function readSave(storage?: Pick<Storage,'getItem'>): Save {
  try {
    const data = JSON.parse((storage ?? localStorage).getItem('duck-revenge-v1') || 'null');
    if (data?.version !== 1) return { ...defaults };
    return {version:1,sound:typeof data.sound === 'boolean' ? data.sound : true,reduced:typeof data.reduced === 'boolean' ? data.reduced : false,
      highScore:Number.isFinite(data.highScore) && data.highScore >= 0 ? data.highScore : 0,
      bestTime:Number.isFinite(data.bestTime) && data.bestTime > 0 ? data.bestTime : null};
  } catch { return { ...defaults }; }
}
export function writeSave(data: Save, storage?: Pick<Storage,'setItem'>) {try {(storage ?? localStorage).setItem('duck-revenge-v1', JSON.stringify(data)); return true;} catch {return false;}}
