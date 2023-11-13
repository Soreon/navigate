/* eslint-disable no-multi-assign */
/* eslint-disable no-bitwise */
export class RandomNumberGenerator {
    func = null;
  
    constructor(seed) {
      this.func = () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
  
    random() {
      return this.func();
    }
  
    weightedRandom(prob) {
      let sum = 0;
      let tot = 0;
      const r = this.func();
      for (const i in prob) tot += prob[i];
      for (const i in prob) {
        sum += prob[i];
        if (r * tot <= sum) return i;
      }
      return 0;
    }
  }
  