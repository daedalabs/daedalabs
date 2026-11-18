'use client';

import { useEffect, useRef } from 'react';

function enhancePre(pre: HTMLElement) {
  // Avoid adding multiple buttons or re-wrapping
  if (pre.getAttribute('data-copy-enhanced') === 'true') return;
  if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
  pre.setAttribute('data-copy-enhanced', 'true');

  const parent = pre.parentElement;
  if (!parent) return;

  // Wrap the scrolling <pre> in a relative non-scrolling container so that
  // the copy button remains pinned to the top-right corner of the code block box
  // instead of sliding horizontally with the pre's scrollable content.
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper relative group my-[1.15em]';
  pre.style.marginTop = '0';
  pre.style.marginBottom = '0';

  parent.insertBefore(wrapper, pre);
  wrapper.appendChild(pre);

  const button = document.createElement('button');
  button.className =
    'absolute right-2 top-2 z-10 rounded border border-line-strong bg-elevated/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-dim opacity-70 transition duration-150 hover:border-ink-dim hover:text-ink hover:opacity-100 focus-visible:opacity-100 backdrop-blur-sm';
  button.type = 'button';
  button.innerText = 'copy';
  button.setAttribute('aria-label', 'Copy code block to clipboard');

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const code = pre.querySelector('code')?.innerText || pre.innerText;
    try {
      await navigator.clipboard.writeText(code);
      button.innerText = 'copied!';
      button.style.color = 'var(--color-accent)';
      setTimeout(() => {
        button.innerText = 'copy';
        button.style.color = '';
      }, 2000);
    } catch {
      button.innerText = 'failed';
    }
  });

  wrapper.appendChild(button);
}

export function CodeBlockEnhancer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    // Enhance any pre elements already present
    parent.querySelectorAll<HTMLElement>('pre').forEach(enhancePre);

    // Watch for new pre elements added asynchronously (e.g. fetched READMEs)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.tagName === 'PRE') {
            enhancePre(node);
          } else {
            node.querySelectorAll<HTMLElement>('pre').forEach(enhancePre);
          }
        }
      }
    });

    observer.observe(parent, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="hidden" aria-hidden="true" />;
}
