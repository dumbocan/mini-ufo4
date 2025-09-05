import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';

const XTerm = ({ onReady }) => {
  const termRef = useRef(null);
  const termInstance = useRef(null);

  useEffect(() => {
    if (termRef.current && !termInstance.current) {
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
      term.loadAddon(fitAddon);
      
      term.open(termRef.current);
      setTimeout(() => {
        fitAddon.fit();
      }, 100); // Add a small delay

      termInstance.current = term;
      
      // Pass the terminal instance to the parent component
      if (onReady) {
        onReady(term);
      }

    }

    // Cleanup on unmount
    return () => {
      if (termInstance.current) {
        termInstance.current.dispose();
        termInstance.current = null;
      }
    };
  }, [onReady]);

  return <div ref={termRef} style={{ width: '100%', height: '400px' }} />;
};

export default XTerm;
