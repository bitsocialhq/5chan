import { useState, useRef } from 'react';
import styles from './highlight-color-picker.module.css';
import { autoUpdate, FloatingFocusManager, FloatingPortal, offset, shift, useClick, useDismiss, useFloating, useId, useInteractions, useRole } from '@floating-ui/react';

interface ColorPickerProps {
  item: any;
  index: number;
  updateLocalFilterItem: (index: number, item: any) => void;
  localFilterItems: any[];
}

const HighlightColorPicker = ({ item, index, updateLocalFilterItem, localFilterItems }: ColorPickerProps) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: 'left-start',
    open: isColorPickerOpen,
    onOpenChange: setIsColorPickerOpen,
    middleware: [offset(10), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const headingId = useId();

  const colorOptions = ['#E0B0FF', '#F2F3F4', '#7DF9FF', '#FFFF00', '#FBCEB1', '#FFBF00', '#ADFF2F', '#0047AB', '#00A550', '#007FFF', '#AF0A0F', '#B5BD68'];

  const colorRows = [colorOptions.slice(0, 4), colorOptions.slice(4, 8), colorOptions.slice(8, 12)];

  const setItemColor = (color: string) => {
    updateLocalFilterItem(index, { ...localFilterItems[index], color });
    setIsColorPickerOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
  };

  const applyCustomColor = () => {
    if (customColor) {
      setItemColor(customColor);
    }
  };

  const clearColor = () => {
    setItemColor('');
  };

  return (
    <>
      <span
        className={styles.colorClickbox}
        style={{ backgroundColor: item.color || '#fff' }}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsColorPickerOpen(!isColorPickerOpen);
          }
        }}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {!item.color && '∕'}
      </span>

      {isColorPickerOpen && (
        <FloatingPortal>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsColorPickerOpen(false);
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsColorPickerOpen(false);
            }}
          />
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              className={styles.colorPickerModal}
              ref={refs.setFloating}
              style={floatingStyles}
              aria-labelledby={headingId}
              {...getFloatingProps()}
              role='presentation'
              onClick={(e) => e.stopPropagation()}
            >
              <table className={styles.colorGrid}>
                <tbody>
                  {colorRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((color, colorIndex) => (
                        <td key={colorIndex}>
                          <span
                            className={styles.colorOption}
                            style={{ backgroundColor: color }}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setItemColor(color);
                              }
                            }}
                            onClick={() => setItemColor(color)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Custom</td>
                  </tr>
                  <tr>
                    <td className={styles.middleTxt} colSpan={4}>
                      <input type='text' ref={inputRef} value={customColor} onChange={handleCustomColorChange} />
                      <span
                        className={styles.colorPreview}
                        style={{
                          backgroundColor: customColor || '#fff',
                        }}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            applyCustomColor();
                          }
                        }}
                        onClick={applyCustomColor}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4}>
                      <span
                        className={styles.button}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsColorPickerOpen(false);
                          }
                        }}
                        onClick={() => setIsColorPickerOpen(false)}
                      >
                        <span className={styles.buttonText}>Close</span>
                      </span>
                      <span
                        className={styles.button}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            clearColor();
                          }
                        }}
                        onClick={clearColor}
                      >
                        <span className={styles.buttonText}>Clear</span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default HighlightColorPicker;
