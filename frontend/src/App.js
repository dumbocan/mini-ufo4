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

// FastAPI uses a different WebSocket library, so we can't use socket.io-client directly.
// We need to use the native WebSocket API.
const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    // Connect to the WebSocket server
    socket.current = new WebSocket(WS_URL);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      setConsoleOutput(prev => [...prev, { type: 'status', content: 'Connected to backend.' }]);
    };

    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.end_of_stream) {
        setIsLoading(false);
        setConsoleOutput(prev => [...prev, { type: 'status', content: 'Task finished.' }]);
        return;
      }
      
      if (message.error) {
        setConsoleOutput(prev => [...prev, { type: 'error', content: message.error }]);
        setIsLoading(false);
        return;
      }

      // Update console output
      setConsoleOutput(prev => [...prev, message]);

      // Update code if it's in the message
      if (message.type === 'code' && message.content) {
        setCode(message.content);
      }
    };

    socket.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConsoleOutput(prev => [...prev, { type: 'status', content: 'Disconnected from backend.' }]);
      setIsLoading(false);
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConsoleOutput(prev => [...prev, { type: 'error', content: 'WebSocket connection error.' }]);
      setIsLoading(false);
    };

    // Clean up the connection when the component unmounts
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, []);

  const handleGenerate = () => {
    if (!prompt || !socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setConsoleOutput([{ type: 'error', content: 'Please enter a prompt and ensure you are connected to the backend.' }]);
      return;
    }
    setIsLoading(true);
    setConsoleOutput([]); // Clear console on new prompt
    setCode(''); // Clear code on new prompt
    socket.current.send(prompt);
  };

  const renderMessage = (msg, index) => {
    // This function will render different message types differently
    // For now, a simple JSON representation
    return <div key={index} className={`message-type-${msg.type}`}>{JSON.stringify(msg)}</div>;
  }

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
          <div style={consoleStyle}>
            {consoleOutput.map(renderMessage)}
          </div>
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
