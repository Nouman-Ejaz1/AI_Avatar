class LipsyncLt {
  constructor() {
    this.rules = {};
    this.visemeDurations = { 'sil': 1 };
    this.specialDurations = { ' ': 1, ',': 3, '-':0.5, "'":0.5 };
  }
  preProcessText(s) { return s; }
  wordsToVisemes(w) { return { words: w.toUpperCase(), visemes: [], times: [], durations: [], i:0 }; }
}
export { LipsyncLt };

