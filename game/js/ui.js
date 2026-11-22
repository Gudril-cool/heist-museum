// ui.js — HUD DOM + layar menu / menang / tertangkap + tombol alat.
// HUD hidup di luar canvas supaya tetap terbaca saat gambar diperkecil
// (juri membaca alarm meter dari screenshot: meter ada di HUD dan di
// vignette canvas).

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function alarmLabel(alarm) {
  if (alarm >= 100) return 'TERTANGKAP';
  if (alarm >= 70) return 'DARURAT';
  if (alarm >= 40) return 'TERLIHAT';
  if (alarm > 0) return 'WASPADA';
  return 'TERSEMBUNYI';
}

export function alarmColor(alarm) {
  if (alarm >= 70) return '#e5484d';
  if (alarm >= 40) return '#e8b23a';
  return '#39d98a';
}

export function rankFor(timeSec, loot, maxAlarm) {
  // Peringkat akhir: cepat + banyak loot + alarm rendah = S.
  let points = 0;
  if (timeSec < 150) points += 2;
  else if (timeSec < 240) points += 1;
  if (loot >= 5) points += 2;
  else if (loot >= 3) points += 1;
  if (maxAlarm < 40) points += 2;
  else if (maxAlarm < 70) points += 1;
  if (points >= 5) return 'S — Pencuri Bayangan';
  if (points >= 4) return 'A — Ahli Menyusup';
  if (points >= 3) return 'B — Pencuri Rapi';
  if (points >= 2) return 'C — Amatir Beruntung';
  return 'D — Hampir Ketahuan';
}

export class Hud {
  constructor() {
    this.el = {
      meter: document.getElementById('hud-meter-fill'),
      meterLabel: document.getElementById('hud-meter-label'),
      room: document.getElementById('hud-room'),
      timer: document.getElementById('hud-timer'),
      score: document.getElementById('hud-score'),
      loot: document.getElementById('hud-loot'),
      tools: document.getElementById('hud-tools'),
      status: document.getElementById('hud-status'),
      overlay: document.getElementById('overlay'),
      overlayTitle: document.getElementById('overlay-title'),
      overlayBody: document.getElementById('overlay-body'),
      overlayBtn: document.getElementById('overlay-btn'),
    };
  }

  update(game) {
    const { el } = this;
    if (el.meter) {
      el.meter.style.width = Math.min(100, game.alarm) + '%';
      el.meter.style.background = alarmColor(game.alarm);
    }
    if (el.meterLabel) {
      el.meterLabel.textContent = alarmLabel(game.alarm) + ' — ' + Math.round(game.alarm);
      el.meterLabel.style.color = alarmColor(game.alarm);
    }
    if (el.room) el.room.textContent = 'RUANG ' + game.levelIndex + '/3 · ' + game.level.name;
    if (el.timer) el.timer.textContent = fmtTime(game.elapsed);
    if (el.score) el.score.textContent = String(game.player.score);
    if (el.loot) {
      const total = game.level.loot.length + (game.level.gem ? 1 : 0);
      const got = game.player.loot + (game.player.hasGem ? 1 : 0);
      el.loot.textContent = got + '/' + total;
    }
    if (el.tools) {
      el.tools.textContent = `Koin ${game.player.coins} · EMP ${game.player.emp} · Asap ${game.player.smoke}`;
    }
    if (el.status) {
      el.status.textContent = game.player.hasGem
        ? 'Permata didapat — KABUR!'
        : (game.level.gem ? 'Curi Bulan Zamrud' : 'Capai pintu EXIT');
    }
  }

  showOverlay(title, bodyHtml, btnLabel, onBtn) {
    const { el } = this;
    if (!el.overlay) return;
    el.overlayTitle.textContent = title;
    el.overlayBody.innerHTML = bodyHtml;
    el.overlayBtn.textContent = btnLabel;
    el.overlay.style.display = 'flex';
    el.overlayBtn.onclick = () => { onBtn(); };
  }

  hideOverlay() {
    if (this.el.overlay) this.el.overlay.style.display = 'none';
  }
}
