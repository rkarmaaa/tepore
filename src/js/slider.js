import { LEVELS, MAX_LEVEL, shapeSVG } from './emotions.js';
import { haptic } from './haptics.js';

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// Riga emozione con slider a scatti (0–5), touch e tastiera
export class MoodSlider {
  constructor(emotion, index, { onInput, onChange }) {
    this.emotion = emotion;
    this.value = 0;
    this.disabled = false;
    this.onInput = onInput;
    this.onChange = onChange;
    this.el = this.#build(index);
    this.slider = this.el.querySelector('.slider');
    this.track = this.slider.querySelector('.track');
    this.level = this.el.querySelector('[data-level]');
    this.thumb = this.el.querySelector('.thumb');
    this.tap = this.el.querySelector('.haptic-tap');
    this.stops = [...this.slider.querySelectorAll('.stops i')];
    this.#bind();
    this.set(0, { silent: true });
    const settle = (e) => {
      if (e.target !== this.el) return;
      this.el.classList.add('is-settled');
      this.el.removeEventListener('animationend', settle);
    };
    this.el.addEventListener('animationend', settle);
  }

  #build(index) {
    const { id, name, the } = this.emotion;
    const li = document.createElement('li');
    li.className = 'mood';
    li.dataset.emo = id;
    li.style.setProperty('--i', index);
    li.innerHTML = `
      <div class="head">
        <span class="icon">${shapeSVG(id)}</span>
        <span class="name" id="mood-${id}">${name}</span>
        <span class="level" data-level aria-hidden="true"></span>
        <button class="info" type="button" data-info="${id}" aria-label="Che cos'è ${the}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.1"/><path d="M12 11.1v5.3M12 7.7v.01"/></svg>
        </button>
      </div>
      <div class="slider" role="slider" tabindex="0" aria-labelledby="mood-${id}"
        aria-valuemin="0" aria-valuemax="${MAX_LEVEL}">
        <div class="track">
          <span class="stops" aria-hidden="true">${'<i></i>'.repeat(MAX_LEVEL + 1)}</span>
          <span class="fill"><span class="thumb"></span></span>
        </div>
        <input class="haptic-tap" type="checkbox" switch aria-hidden="true" tabindex="-1">
      </div>`;
    return li;
  }

  #bind() {
    const s = this.slider;
    let start = null;
    let dragging = false;
    let grab = 0;

    // Lo switch invisibile copre la traccia: il pomello si riconosce dalla
    // posizione del dito, non da e.target, che sarebbe sempre lo switch.
    const onThumb = (x, y) => {
      const r = this.thumb.getBoundingClientRect();
      return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
    };

    // Distanza dito-centro del pomello: niente salti alla presa
    const pFromX = (x) => {
      const r = this.track.getBoundingClientRect();
      return clamp01((x - grab - r.left - r.height / 2) / (r.width - r.height));
    };

    // iOS: blocca lo scroll se il gesto parte dal pomello o è orizzontale
    let touch = null;
    s.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      const grabbing = onThumb(t.clientX, t.clientY);
      touch = { x: t.clientX, y: t.clientY, decided: grabbing, lock: grabbing };
    }, { passive: true });

    s.addEventListener('touchmove', (e) => {
      if (!touch || this.disabled) return;
      if (!touch.decided) {
        const t = e.touches[0];
        touch.decided = true;
        touch.lock = Math.abs(t.clientX - touch.x) >= Math.abs(t.clientY - touch.y);
      }
      if (touch.lock && e.cancelable) e.preventDefault();
    }, { passive: false });

    const touchEnd = () => { touch = null; };
    s.addEventListener('touchend', touchEnd);
    s.addEventListener('touchcancel', touchEnd);

    const move = (p) => {
      this.el.style.setProperty('--p', p);
      const v = Math.round(p * MAX_LEVEL);
      if (v !== this.value) {
        this.value = v;
        this.#paint(true);
        // Gli estremi si sentono più pieni: il dito capisce dov'è il fondo
        haptic(v === 0 || v === MAX_LEVEL ? 'soft' : 'tick');
      }
      this.onInput?.(this.value, p);
    };

    const end = (commit) => {
      if (!start) return;
      if (dragging) {
        s.classList.remove('is-dragging');
        this.el.classList.remove('is-dragging');
      }
      this.tap.hidden = false;
      if (commit) {
        this.el.style.setProperty('--p', this.value / MAX_LEVEL);
        this.onInput?.(this.value, this.value / MAX_LEVEL);
        this.onChange?.(this.value);
      }
      start = null;
      dragging = false;
    };

    s.addEventListener('pointerdown', (e) => {
      if (this.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const thumb = onThumb(e.clientX, e.clientY) ? this.thumb : null;
      grab = 0;
      if (thumb) {
        const r = thumb.getBoundingClientRect();
        grab = Math.max(-r.width / 2, Math.min(r.width / 2, e.clientX - r.left - r.width / 2));
      }
      start = { x: e.clientX, y: e.clientY, v: this.value, id: e.pointerId };
      // Mouse o pomello: si trascina subito; sulla traccia si attende la direzione
      if (e.pointerType === 'mouse' || thumb) this.#startDrag(e, () => { dragging = true; });
    });

    s.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const wants = touch?.decided ? touch.lock : Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy);
      if (!dragging && wants) {
        this.#startDrag(e, () => { dragging = true; });
      }
      if (dragging) move(pFromX(e.clientX));
    });

    s.addEventListener('pointerup', (e) => {
      if (!start) return;
      // Tocco singolo: salta al livello toccato
      if (!dragging) {
        grab = 0;
        const v = Math.round(pFromX(e.clientX) * MAX_LEVEL);
        if (v !== this.value) {
          this.value = v;
          this.#paint(true);
          haptic(v === 0 || v === MAX_LEVEL ? 'soft' : 'tick');
        }
      }
      end(true);
    });

    s.addEventListener('pointercancel', () => {
      if (!start) return;
      if (dragging) this.value = start.v;
      this.#paint(false);
      end(true);
    });

    s.addEventListener('lostpointercapture', () => { if (dragging) end(true); });

    s.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 };
      let v = this.value;
      if (e.key in steps) v += steps[e.key];
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = MAX_LEVEL;
      else return;
      e.preventDefault();
      v = Math.max(0, Math.min(MAX_LEVEL, v));
      if (v === this.value) return;
      this.set(v);
      haptic(v === 0 || v === MAX_LEVEL ? 'soft' : 'tick');
      this.onInput?.(v, v / MAX_LEVEL);
      this.onChange?.(v);
    });
  }

  // Presa del pomello: lo switch si toglie di mezzo, altrimenti a metà corsa
  // darebbe un tocco che non corrisponde a nessuno scatto.
  #startDrag(e, done) {
    haptic('tick');
    this.tap.hidden = true;
    this.slider.setPointerCapture?.(e.pointerId);
    this.slider.classList.add('is-dragging');
    this.el.classList.add('is-dragging');
    done();
  }

  #paint(tick) {
    const v = this.value;
    const s = this.slider;
    s.setAttribute('aria-valuenow', v);
    s.setAttribute('aria-valuetext', LEVELS[v]);
    s.classList.toggle('is-zero', v === 0);
    this.el.classList.toggle('is-active', v > 0);
    this.stops.forEach((stop, i) => {
      stop.classList.toggle('is-on', i < v);
      stop.classList.toggle('is-current', i === v);
    });
    this.level.textContent = LEVELS[v];
    if (tick) {
      this.level.classList.remove('is-ticking');
      void this.level.offsetWidth;
      this.level.classList.add('is-ticking');
    }
  }

  set(v, { silent = false } = {}) {
    this.value = v;
    this.el.style.setProperty('--p', v / MAX_LEVEL);
    this.#paint(!silent);
  }

  setDisabled(flag) {
    this.disabled = flag;
    this.slider.classList.toggle('is-disabled', flag);
    this.slider.setAttribute('aria-disabled', String(flag));
    this.slider.tabIndex = flag ? -1 : 0;
  }
}
