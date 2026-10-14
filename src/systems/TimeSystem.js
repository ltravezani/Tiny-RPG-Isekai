import { events } from './EventBus.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = { spring: 'Primavera', summer: 'Verão', autumn: 'Outono', winter: 'Inverno' };
const DAY_START = 6 * 60;       // 6h
const DAY_END = 26 * 60;        // 2h da madrugada seguinte
const MS_PER_MINUTE = 700;      // 1 minuto de jogo = 0,7 s real
const DAYS_PER_SEASON = 28;

export class TimeSystem {
  constructor(state = {}) {
    this.day = state.day ?? 1;
    this.season = state.season ?? 'spring';
    this.year = state.year ?? 1;
    this.minutes = state.minutes ?? DAY_START;
    this.acc = 0;
    this.paused = false;
  }

  update(dt) {
    if (this.paused) return;
    this.acc += dt;
    while (this.acc >= MS_PER_MINUTE) {
      this.acc -= MS_PER_MINUTE;
      this.minutes++;
      if (this.minutes % 10 === 0) events.emit('time:tick', this.snapshot());
      if (this.minutes >= DAY_END) {
        events.emit('player:passedOut', this.snapshot());
        return;
      }
    }
  }

  // Avança para as 6h do dia seguinte.
  nextDay() {
    this.minutes = DAY_START;
    this.acc = 0;
    this.day++;
    if (this.day > DAYS_PER_SEASON) {
      this.day = 1;
      const i = SEASONS.indexOf(this.season) + 1;
      if (i >= SEASONS.length) this.year++;
      this.season = SEASONS[i % SEASONS.length];
    }
    events.emit('day:start', this.snapshot());
  }

  clockText() {
    const h = Math.floor(this.minutes / 60) % 24, m = this.minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m - (m % 10)).padStart(2, '0')}`;
  }

  snapshot() {
    return { day: this.day, season: this.season, year: this.year, minutes: this.minutes };
  }
}
