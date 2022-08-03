export const WIDTH_LS_KEY = "builder.widthSetting";
export const FRAMES_LS_KEY = "builder.useFramesSetting";

// TODO: make async and use figma.clientStorage
export function lsGet(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key)!);
  } catch (err) {
    return undefined;
  }
}
export function lsSet(key: string, value: any) {
  try {
    return localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    return undefined;
  }
}
