import { events } from './EventBus.js';

// Clima do dia (roteiro, seção 5). Chuva rega a fazenda inteira na virada do dia.
export const WEATHER_NAMES = { sunny: 'Sol', cloudy: 'Nublado', rain: 'Chuva' };
const TABLE = [['sunny', 0.55], ['cloudy', 0.25], ['rain', 0.2]];

export class WeatherSystem {
  constructor(state = {}, rng = Math.random) {
    this.today = state.today ?? 'sunny';
    this.rng = rng;
  }

  roll(season) {
    let r = this.rng();
    this.today = 'sunny';
    for (const [w, p] of TABLE) {
      if ((r -= p) < 0) { this.today = w; break; }
    }
    if (season === 'winter' && this.today === 'rain') this.today = 'cloudy';
    events.emit('weather:changed', { weather: this.today });
    return this.today;
  }

  snapshot() { return { today: this.today }; }
}
