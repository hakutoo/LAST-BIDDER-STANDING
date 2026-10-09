export function spinRoulette(list: number[]): number {
    let totalweight = list.reduce((total, num) => total + num, 0);
    let pressedlist = list.map(num => num / totalweight);
    let random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < pressedlist.length; i++) {
        cumulative += pressedlist[i];
        if (random <= cumulative) {
            return i;
        }
    }
    return pressedlist.length - 1; // Fallback in case of rounding errors
} 