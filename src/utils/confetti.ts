import confetti from 'canvas-confetti';

export function triggerQuizCompletionConfetti() {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);

    // Left cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'],
    });
    // Right cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'],
    });
  }, 250);
}

export function triggerStreakConfetti() {
  confetti({
    particleCount: 50,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#F59E0B', '#EF4444', '#EC4899', '#10B981'],
    zIndex: 9999,
  });
}
