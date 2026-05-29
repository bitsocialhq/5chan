import { useEffect } from 'react';
import useTheme from '../../hooks/use-theme';
import useSpecialThemeStore from '../../stores/use-special-theme-store';
import { getActiveSpecialTheme } from '../../lib/utils/time-utils';
import styles from './style-selector.module.css';

const StyleSelector = () => {
  const [theme, setTheme] = useTheme();
  const { isEnabled, setIsEnabled } = useSpecialThemeStore();
  const activeSpecialTheme = getActiveSpecialTheme();

  useEffect(() => {
    if (!activeSpecialTheme && isEnabled) {
      setIsEnabled(false);
    }
  }, [activeSpecialTheme, isEnabled, setIsEnabled]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;

    if (newTheme === 'special') {
      setIsEnabled(true);
    } else {
      setIsEnabled(false);
      setTheme(newTheme);
    }
  };

  return (
    <select className={styles.select} value={isEnabled ? 'special' : theme} onChange={handleThemeChange}>
      <option value='yotsuba'>Yotsuba</option>
      <option value='yotsuba-b'>Yotsuba B</option>
      <option value='futaba'>Futaba</option>
      <option value='burichan'>Burichan</option>
      <option value='tomorrow'>Tomorrow</option>
      <option value='photon'>Photon</option>
      {activeSpecialTheme && <option value='special'>Special</option>}
    </select>
  );
};

export default StyleSelector;
