import React, { useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';

const XTerm = React.forwardRef((props, ref) => {
  const termRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const safeFit = useCallback(() => {
    const term = xtermInstance.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !fitAddon) return;

    const el = term.element;
    if (!el || !el.isConnected) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    try {
      fitAddon.fit();
      term.refresh(0, term.rows - 1);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (termRef.current && !xtermInstance.current) {
      const term = new Terminal({
        convertEol: true,
        fontFamily: '"Fira Code", "Fira Mono", monospace',
        fontSize: 12,
        theme: {
          background: '#212529',
          foreground: '#f8f9fa',
        }
      });

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      xtermInstance.current = term;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          safeFit();
        });
      });

      resizeObserverRef.current = new ResizeObserver(() => {
        safeFit();
      });
      try {
        resizeObserverRef.current.observe(termRef.current);
      } catch {}
    }

    return () => {
      try {
        if (resizeObserverRef.current && termRef.current) {
          resizeObserverRef.current.unobserve(termRef.current);
        }
      } catch {}
      resizeObserverRef.current = null;

      if (xtermInstance.current) {
        try { xtermInstance.current.dispose(); } catch {}
        xtermInstance.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [safeFit]);

  useImperativeHandle(ref, () => ({
    write: (text) => {
      if (xtermInstance.current) {
        xtermInstance.current.write(text);
      }
    },
    clear: () => {
      if (xtermInstance.current) {
        xtermInstance.current.clear();
      }
    },
    getBuffer: () => {
        if (xtermInstance.current) {
            try {
                const buffer = xtermInstance.current.buffer.active;
                const lines = [];
                for (let i = 0; i < buffer.length; i++) {
                    const line = buffer.getLine(i);
                    if (line) {
                        lines.push(line.translateToString(true));
                    }
                }
                return lines.join('\n');
            } catch (e) {
                console.warn('Could not read xterm buffer:', e);
                return '';
            }
        }
        return '';
    }
  }));

  return <div ref={termRef} style={{ width: '100%', height: '400px' }} />;
});

export default XTerm;