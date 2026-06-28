import { useMemo, type ReactNode } from 'react';
import { parse } from '@bbob/parser';
import { useLocation } from 'react-router-dom';
import { parseHttpUrl } from '../../lib/utils/url-utils';
import { HAS_CODE_TAG_REGEX, isCodeTagsEnabledForContext, splitCodeTagSegments } from '../../lib/code-tags';
import { useDirectories } from '../../hooks/use-directories';
import CodeBlock from '../code-block/code-block';
import Markdown from '../markdown/markdown';
import styles from './bbcode-content.module.css';

const ALLOWED_BBCODE_TAGS = ['b', 'i', 'u', 's', 'color', 'size', 'quote', 'url'];
const COLOR_CLASS_BY_NAME: Record<string, string> = {
  red: styles.colorRed,
};
const SIZE_CLASS_BY_NAME: Record<string, string> = {
  '12': styles.size12,
  '16': styles.size16,
  '20': styles.size20,
  '24': styles.size24,
  '32': styles.size32,
  large: styles.sizeLarge,
};

type BbcodeNode =
  | string
  | number
  | null
  | {
      attrs?: Record<string, unknown>;
      content?: BbcodeNode | BbcodeNode[];
      tag?: unknown;
    };

interface BbcodeContentProps {
  communityAddress?: string;
  content: string;
  postCid?: string;
}

const getFirstAttributeValue = (attrs: Record<string, unknown> | undefined): string | undefined => {
  const firstEntry = Object.entries(attrs || {})[0];
  if (!firstEntry) return undefined;

  const [key, value] = firstEntry;
  return typeof value === 'string' ? value : key;
};

const normalizeContent = (content: BbcodeNode | BbcodeNode[] | undefined): BbcodeNode[] => {
  if (Array.isArray(content)) return content;
  return typeof content === 'undefined' ? [] : [content];
};

const getPlainTextContent = (content: BbcodeNode | BbcodeNode[] | undefined): string =>
  normalizeContent(content)
    .map((node) => {
      if (node === null) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      return getPlainTextContent(node.content);
    })
    .join('');

type BbcodeRenderContext = Pick<BbcodeContentProps, 'communityAddress' | 'postCid'>;

const renderNode = (node: BbcodeNode, key: string, context: BbcodeRenderContext): ReactNode => {
  if (node === null) return null;
  if (typeof node === 'string' || typeof node === 'number') {
    const content = String(node);
    return content ? <Markdown key={key} content={content} postCid={context.postCid} communityAddress={context.communityAddress} /> : null;
  }

  const tag = typeof node.tag === 'string' ? node.tag.toLowerCase() : '';
  const children = normalizeContent(node.content).map((child, index) => renderNode(child, `${key}-${index}`, context));

  switch (tag) {
    case 'b':
      return <strong key={key}>{children}</strong>;
    case 'i':
      return <em key={key}>{children}</em>;
    case 'u':
      return (
        <span key={key} className={styles.underline}>
          {children}
        </span>
      );
    case 's':
      return <s key={key}>{children}</s>;
    case 'color': {
      const colorName = getFirstAttributeValue(node.attrs)?.trim().toLowerCase();
      const colorClass = colorName ? COLOR_CLASS_BY_NAME[colorName] : undefined;
      return colorClass ? (
        <span key={key} className={colorClass}>
          {children}
        </span>
      ) : (
        <span key={key}>{children}</span>
      );
    }
    case 'size': {
      const sizeName = getFirstAttributeValue(node.attrs)?.trim().toLowerCase();
      const sizeClass = sizeName ? SIZE_CLASS_BY_NAME[sizeName] : undefined;
      return sizeClass ? (
        <span key={key} className={sizeClass}>
          {children}
        </span>
      ) : (
        <span key={key}>{children}</span>
      );
    }
    case 'quote':
      return (
        <span key={key} className={styles.quote}>
          {children}
        </span>
      );
    case 'url': {
      const urlValue = getFirstAttributeValue(node.attrs) || getPlainTextContent(node.content);
      const parsedUrl = parseHttpUrl(urlValue.trim());
      return parsedUrl ? (
        <a key={key} href={parsedUrl.href} target='_blank' rel='noopener noreferrer'>
          {children}
        </a>
      ) : (
        <span key={key}>{children}</span>
      );
    }
    default:
      return <span key={key}>{children}</span>;
  }
};

const renderBbcodeSegment = (content: string, key: string, context: BbcodeRenderContext): ReactNode[] => {
  const nodes = parse(content, {
    caseFreeTags: true,
    onlyAllowTags: ALLOWED_BBCODE_TAGS,
  }) as BbcodeNode[];

  return nodes.map((node, index) => renderNode(node, `${key}-${index}`, context));
};

const BbcodeContent = ({ communityAddress, content, postCid }: BbcodeContentProps) => {
  const location = useLocation();
  const directories = useDirectories();
  const enableCodeTags = isCodeTagsEnabledForContext(location.pathname, communityAddress, directories);

  const nodes = useMemo<ReactNode[]>(() => {
    const context = { communityAddress, postCid };
    const raw = content || '';

    if (!enableCodeTags || !HAS_CODE_TAG_REGEX.test(raw)) {
      return renderBbcodeSegment(raw, 'bbcode', context);
    }

    const elements: ReactNode[] = [];
    splitCodeTagSegments(raw).forEach((segment) => {
      if (segment.type === 'code') {
        elements.push(<CodeBlock key={`code-${segment.start}`} source={segment.value} />);
        return;
      }

      if (!segment.value) return;
      elements.push(...renderBbcodeSegment(segment.value, `bbcode-${segment.start}`, context));
    });

    return elements;
  }, [communityAddress, content, enableCodeTags, postCid]);

  return <span className={styles.content}>{nodes}</span>;
};

export default BbcodeContent;
