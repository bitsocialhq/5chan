import useSpecialThemeStore from '../stores/use-special-theme-store';
import { getActiveSpecialTheme } from './utils/time-utils';

interface SnowOptions {
  flakeCount: number;
}

// Add this new variable to track manual override
let manualSnowOverride: boolean | null = null;

export const initSnow = ({ flakeCount }: SnowOptions): void => {
  const randomRange = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const snowflakeName = 'js-snowflake';

  let rule = `.${snowflakeName} {
    position: absolute;
    width: 10px;
    height: 10px;
    background: linear-gradient(white, white); 
    border-radius: 50%;
    filter: drop-shadow(0 0 10px white);
  }`;

  for (let i = 1; i < flakeCount; i++) {
    const randomX = Math.random() * 100;
    const randomOffset = randomRange(-100000, 100000) * 0.0001;
    const randomXEnd = randomX + randomOffset;
    const randomXEndYoyo = randomX + randomOffset / 2;
    const randomYoyoTime = randomRange(30000, 80000) / 100000;
    const randomYoyoY = randomYoyoTime * 100;
    const randomScale = Math.random() * (1.0 - 0.2) + 0.2;
    const fallDuration = randomRange(10, 30);
    const fallDelay = (Math.floor(Math.random() * 30) + 1) * -1;
    const alpha = Math.random() * (1.0 - 0.1) + 0.1;

    rule += `
    .${snowflakeName}:nth-child(${i}) {
        opacity: ${alpha};
        transform: translate(${randomX}vw, -10px) scale(${randomScale});
        animation: fall-${i} ${fallDuration}s ${fallDelay}s linear infinite;
    }

    @keyframes fall-${i} {
        ${randomYoyoTime * 100}% {
            transform: translate(${randomXEnd}vw, ${randomYoyoY}vh) scale(${randomScale});
        }

        to {
            transform: translate(${randomXEndYoyo}vw, 100vh) scale(${randomScale});
        }
    }`;
  }

  const container = document.createElement('div');
  container.id = 'js-snowfield';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';

  for (let i = 1; i < flakeCount; i++) {
    const flake = document.createElement('div');
    flake.className = snowflakeName;
    container.appendChild(flake);
  }

  const css = document.createElement('style');
  css.type = 'text/css';
  css.textContent = rule;
  document.getElementsByTagName('head')[0].appendChild(css);
  document.body.appendChild(container);
};

export const removeSnow = (): void => {
  const element = document.getElementById('js-snowfield');
  if (element) {
    element.parentNode?.removeChild(element);
  }
};

export const shouldShowSnow = (): boolean => {
  const isEnabled = useSpecialThemeStore.getState().isEnabled;
  const activeSpecialTheme = getActiveSpecialTheme();

  // Check store value first
  if (isEnabled !== null) {
    return isEnabled && activeSpecialTheme === 'christmas';
  }

  // Check manual override second
  if (manualSnowOverride !== null) {
    return manualSnowOverride;
  }

  return activeSpecialTheme === 'christmas';
};
