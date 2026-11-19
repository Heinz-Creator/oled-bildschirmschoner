export const EVENT_NAMES = {
  laundry: "Waschmaschine fertig",
  dishes: "Geschirrspüler fertig",
  waste: "Müllabholung · Vortag & heute",
  charging: "Auto lädt mit Sonnenstrom",
  visitor: "Besuch an der Tür",
};
export const EVENT_DEFAULTS = {
  durations: { laundry: 10, dishes: 10, waste: 12, charging: 10, visitor: 15 },
  finishedLifetime: 120,
  wasteRepeat: 300,
};

/** Wall-clock scheduling stays independent from the animation's pause button. */
export class EventSchedule {
  constructor(settings = EVENT_DEFAULTS) {
    this.settings = settings;
    this.events = new Map();
    this.current = null;
    this.switchAt = 0;
    this.visitorStartedAt = null;
    this.lastNormal = null;
  }
  set(key, enabled, now) {
    if (!enabled) {
      this.events.delete(key);
      if (this.current === key) this.current = null;
      return;
    }
    this.events.set(key, { startedAt: now, nextAt: now });
    if (key === "visitor") this.visitorStartedAt ??= now;
  }
  active(now) {
    for (const [key, event] of this.events) {
      const lifetime =
        key === "visitor"
          ? this.settings.durations.visitor
          : ["laundry", "dishes"].includes(key)
            ? this.settings.finishedLifetime
            : 0;
      if (lifetime > 0 && now - event.startedAt >= lifetime * 1000)
        this.events.delete(key);
    }
    if (this.events.has("visitor")) return "visitor";
    if (this.visitorStartedAt !== null) {
      this.switchAt += now - this.visitorStartedAt;
      this.visitorStartedAt = null;
    }
    if (this.current && !this.events.has(this.current)) this.current = null;
    if (this.current && now < this.switchAt) return this.current;
    if (this.current === "waste")
      this.events.get("waste").nextAt = now + this.settings.wasteRepeat * 1000;
    if (this.current) this.lastNormal = this.current;
    const available = [...this.events]
      .filter(([key, event]) => key !== "visitor" && event.nextAt <= now)
      .map(([key]) => key);
    if (!available.length) {
      this.current = null;
      return null;
    }
    // Keep the full order when a repeating reminder enters its cooldown.
    // Removing it before locating the cursor would skip the event after it.
    const order=[...this.events.keys()].filter(key=>key!=='visitor');
    const lastIndex=order.indexOf(this.lastNormal);
    this.current=Array.from({length:order.length},(_,index)=>order[(lastIndex+1+index)%order.length]).find(key=>available.includes(key));
    this.switchAt = now + this.settings.durations[this.current] * 1000;
    return this.current;
  }
}
