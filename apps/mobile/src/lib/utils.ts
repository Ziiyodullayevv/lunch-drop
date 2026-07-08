export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
