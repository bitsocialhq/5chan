import BbcodeContent from '../bbcode-content/bbcode-content';
import styles from './bbcode-editor-toolbar.module.css';

interface BbcodeButton {
  className?: string;
  close: string;
  label: string;
  open: string;
  placeholder: string;
  title: string;
}

const BBCODE_BUTTONS: BbcodeButton[] = [
  {
    className: styles.boldButton,
    close: '[/b]',
    label: 'B',
    open: '[b]',
    placeholder: 'bold text',
    title: 'Bold',
  },
  {
    className: styles.italicButton,
    close: '[/i]',
    label: 'I',
    open: '[i]',
    placeholder: 'italic text',
    title: 'Italic',
  },
  {
    className: styles.underlineButton,
    close: '[/u]',
    label: 'U',
    open: '[u]',
    placeholder: 'underlined text',
    title: 'Underline',
  },
  {
    className: styles.strikeButton,
    close: '[/s]',
    label: 'S',
    open: '[s]',
    placeholder: 'struck text',
    title: 'Strikethrough',
  },
  {
    className: styles.redButton,
    close: '[/color]',
    label: 'Red',
    open: '[color=red]',
    placeholder: 'red text',
    title: 'Red text',
  },
];

const SIZE_OPTIONS = [
  { label: '12px', value: '12' },
  { label: '16px', value: '16' },
  { label: '20px', value: '20' },
  { label: '24px', value: '24' },
  { label: '32px', value: '32' },
];

interface BbcodeEditorToolbarProps {
  isPreviewing: boolean;
  onChange: (value: string, selectionStart?: number, selectionEnd?: number) => void;
  onPreviewToggle: () => void;
  textareaRef: { current: HTMLTextAreaElement | null };
}

const applyBbcode = (textarea: HTMLTextAreaElement, open: string, close: string, placeholder: string) => {
  const value = textarea.value;
  const selectionStart = textarea.selectionStart ?? value.length;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const selectedText = value.slice(selectionStart, selectionEnd);
  const innerText = selectedText || placeholder;
  const insertion = `${open}${innerText}${close}`;
  const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
  const nextSelectionStart = selectionStart + open.length;
  const nextSelectionEnd = nextSelectionStart + innerText.length;

  textarea.value = nextValue;
  textarea.focus();
  textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);

  return {
    nextSelectionEnd,
    nextSelectionStart,
    nextValue,
  };
};

const applyLinkBbcode = (textarea: HTMLTextAreaElement) => {
  const value = textarea.value;
  const selectionStart = textarea.selectionStart ?? value.length;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const selectedText = value.slice(selectionStart, selectionEnd) || 'link text';
  const urlPlaceholder = 'https://example.com';
  const open = `[url=${urlPlaceholder}]`;
  const close = '[/url]';
  const insertion = `${open}${selectedText}${close}`;
  const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
  const nextSelectionStart = selectionStart + '[url='.length;
  const nextSelectionEnd = nextSelectionStart + urlPlaceholder.length;

  textarea.value = nextValue;
  textarea.focus();
  textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);

  return {
    nextSelectionEnd,
    nextSelectionStart,
    nextValue,
  };
};

const BbcodeEditorToolbar = ({ isPreviewing, onChange, onPreviewToggle, textareaRef }: BbcodeEditorToolbarProps) => {
  const updateContent = (value: string, selectionStart?: number, selectionEnd?: number) => onChange(value, selectionStart, selectionEnd);

  const handleApply = (open: string, close: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea || isPreviewing) return;

    const { nextSelectionEnd, nextSelectionStart, nextValue } = applyBbcode(textarea, open, close, placeholder);
    updateContent(nextValue, nextSelectionStart, nextSelectionEnd);
  };

  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea || isPreviewing) return;

    const { nextSelectionEnd, nextSelectionStart, nextValue } = applyLinkBbcode(textarea);
    updateContent(nextValue, nextSelectionStart, nextSelectionEnd);
  };

  return (
    <div className={styles.toolbar} aria-label='BBCode formatting'>
      {BBCODE_BUTTONS.map((button) => (
        <button
          key={button.open}
          type='button'
          className={`${styles.toolbarButton} ${button.className || ''}`}
          aria-label={button.title}
          title={button.title}
          disabled={isPreviewing}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleApply(button.open, button.close, button.placeholder)}
        >
          {button.label}
        </button>
      ))}
      <button
        type='button'
        className={styles.toolbarButton}
        aria-label='Link'
        title='Link'
        disabled={isPreviewing}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleLink}
      >
        🔗
      </button>
      <select
        className={styles.toolbarSelect}
        aria-label='Text size'
        title='Text size'
        defaultValue=''
        disabled={isPreviewing}
        onChange={(event) => {
          const size = event.target.value;
          if (size) {
            handleApply(`[size=${size}]`, '[/size]', `${size}px text`);
            event.target.value = '';
          }
        }}
      >
        <option value=''>Size</option>
        {SIZE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type='button' className={styles.toolbarButton} aria-label={isPreviewing ? 'Edit BBCode' : 'Preview BBCode'} onClick={onPreviewToggle}>
        {isPreviewing ? 'Edit' : 'Preview'}
      </button>
    </div>
  );
};

export const BbcodePreview = ({ communityAddress, content, postCid }: { communityAddress?: string; content: string; postCid?: string }) => (
  <div className={styles.preview} aria-label='BBCode preview'>
    <BbcodeContent content={content} postCid={postCid} communityAddress={communityAddress} />
  </div>
);

export default BbcodeEditorToolbar;
