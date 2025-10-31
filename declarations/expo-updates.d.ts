// Minimal ambient module declaration to allow optional use of expo-updates
declare module 'expo-updates' {
  export function reloadAsync(): Promise<void>;
  export const Updates: any;
  export default { reloadAsync: reloadAsync };
}

