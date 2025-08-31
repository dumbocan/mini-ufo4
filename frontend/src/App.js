import React, { useState } from 'react';
import axios from 'axios'; // Import axios
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap'; // Add Spinner
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('# Your generated code will appear here');
  const [consoleOutput, setConsoleOutput] = useState('Console output will appear here...');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) {
      setConsoleOutput('Please enter a prompt first.');
      return;
    }
    setIsLoading(true);
    setConsoleOutput(`> ${prompt}\nSending request to backend...`);

    try {
      const response = await axios.post(`${API_URL}/generate`, {
        prompt: prompt,
        session_id: sessionId,
      });

      const { session_id, status, stdout, stderr, code: resultCode } = response.data;

      setSessionId(session_id);
      setCode(resultCode);

      let output = `Status: ${status}\n\n`;
      if (stdout) {
        output += `--- STDOUT ---\n${stdout}\n`;
      }
      if (stderr) {
        output += `--- STDERR ---\n${stderr}\n`;
      }
      setConsoleOutput(output);

    } catch (error) {
      let errorMessage = 'Error connecting to the backend.';
      if (error.response) {
        errorMessage = `Error: ${error.response.status} ${error.response.statusText}\n${JSON.stringify(error.response.data, null, 2)}`;
      } else if (error.request) {
        errorMessage = 'Backend is not responding. Please ensure it is running.';
      } else {
        errorMessage = `An unexpected error occurred: ${error.message}`;
      }
      setConsoleOutput(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
                placeholder="e.g., 'print(\"hello world\")'"
                disabled={isLoading}
              />
            </Form.Group>
            <Button variant="primary" onClick={handleGenerate} className="mt-2" disabled={isLoading}>
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
          <pre style={consoleStyle}>{consoleOutput}</pre>
        </Col>
        <Col md={6}>
          <h5>Generated Code</h5>
          <div style={editorStyle}>
            <Editor
              value={code}
              onValueChange={code => setCode(code)}
              highlight={code => highlight(code, languages.python)}
              padding={10}
              disabled={isLoading}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default App;