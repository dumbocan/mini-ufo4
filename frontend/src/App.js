import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState(''); // Changed to string
  const [isLoading, setIsLoading] = useState(false);
  const socket = useRef(null);
  const currentMessageBuffer = useRef(''); // Buffer for 'message' type chunks
  const currentCodeBuffer = useRef(''); // New buffer for code

  useEffect(() => {
    socket.current = new WebSocket(WS_URL);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      setConsoleOutput(prev => prev + 'Connected to backend.\n');
    };

    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      // Helper to process message content for display
      const processMessageContent = (content) => {
        let processed = content;
        // Rule 1: Replace double newlines with single newline
        processed = processed.replace(/\n\n/g, '\n');
        // Rule 2: Replace single newlines with a space
        processed = processed.replace(/\n/g, ' ');
        return processed.trim();
      };

      // Helper to flush the current message buffer
      const flushMessageBuffer = () => {
        if (currentMessageBuffer.current) {
          setConsoleOutput(prev => prev + processMessageContent(currentMessageBuffer.current) + '\n');
          currentMessageBuffer.current = '';
        }
      };

      // Helper to flush the current code buffer
      const flushCodeBuffer = () => {
        if (currentCodeBuffer.current) {
          setConsoleOutput(prev => prev + '\n--- CODE ---\n' + currentCodeBuffer.current + '\n');
          currentCodeBuffer.current = '';
        }
      };

      if (message.end_of_stream) {
        flushMessageBuffer();
        flushCodeBuffer(); // Flush any pending code
        setIsLoading(false);
        setConsoleOutput(prev => prev + 'Task finished.\n');
        return;
      }
      
      if (message.error) {
        flushMessageBuffer();
        flushCodeBuffer(); // Flush any pending code
        setConsoleOutput(prev => prev + `Error: ${message.error}\n`);
        setIsLoading(false);
        return;
      }

      if (message.type === 'message' && message.content) {
        flushCodeBuffer(); // If a message comes, flush any pending code
        currentMessageBuffer.current += message.content;
      } else if (message.type === 'code' && message.content) {
        flushMessageBuffer(); // If code comes, flush any pending message
        currentCodeBuffer.current += message.content; // Accumulate code
        setCode(prevCode => prevCode + message.content); // Still update code editor
      } else if (message.type === 'console' && message.content) {
        flushMessageBuffer(); // Flush any pending message
        flushCodeBuffer(); // Flush any pending code
        setConsoleOutput(prev => prev + '\n--- OUTPUT ---\n' + message.content + '\n');
      } else if (message.type === 'status' && message.content) {
        flushMessageBuffer(); // Flush any pending message
        flushCodeBuffer(); // Flush any pending code
        setConsoleOutput(prev => prev + `Status: ${message.content}\n`);
      }
      // Ignore start/end markers or other unknown types
    };

    socket.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConsoleOutput(prev => prev + 'Disconnected from backend.\n');
      setIsLoading(false);
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConsoleOutput(prev => prev + 'WebSocket connection error.\n');
      setIsLoading(false);
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, []);

  const handleGenerate = () => {
    if (!prompt || !socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setConsoleOutput('Please enter a prompt and ensure you are connected to the backend.\n');
      return;
    }
    setIsLoading(true);
    setConsoleOutput(''); // Clear console on new prompt
    setCode(''); // Clear code on new prompt
    socket.current.send(prompt);
  };

  const editorStyle = {
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: 14,
    border: '1px solid #ced4da',
    borderRadius: '0.25rem',
    minHeight: '400px',
    backgroundColor: '#f8f9fa'
  };

  const consoleStyle = {
    backgroundColor: '#212529',
    color: '#f8f9fa',
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: 12,
    minHeight: '200px',
    padding: '10px',
    borderRadius: '0.25rem',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  };

  return (
    <Container fluid className="p-3">
      <Row>
        <Col>
          <h1 className="mb-4">Mini-UFO 4</h1>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form>
            <Form.Group controlId="prompt-textarea">
              <Form.Label>Your Prompt</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Plot the first 100 fibonacci numbers'"
                disabled={isLoading}
              />
            </Form.Group>
            <Button variant="primary" onClick={handleGenerate} className="mt-2" disabled={isLoading || !socket.current || socket.current.readyState !== WebSocket.OPEN}>
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  {' Generating...'}
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </Form>

          <h5 className="mt-4">Console</h5>
          <pre style={consoleStyle}>
            {consoleOutput}
          </pre>
        </Col>
        <Col md={6}>
          <h5>Generated Code</h5>
          <div style={editorStyle}>
            <Editor
              value={code}
              onValueChange={code => setCode(code)}
              highlight={code => highlight(code, languages.python)}
              padding={10}
              disabled={true} // Code is now read-only from the agent
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default App;