import React, { useState } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css'; //Example style, you can use another

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('# Write your prompt and click Generate');
  const [consoleOutput, setConsoleOutput] = useState('Console output will appear here...');

  const handleGenerate = () => {
    // Placeholder for backend call
    console.log('Generating code for prompt:', prompt);
    setConsoleOutput(`> ${prompt}\nGenerating code...`);
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
                placeholder="e.g., 'Create a python script that prints numbers from 1 to 10'"
              />
            </Form.Group>
            <Button variant="primary" onClick={handleGenerate} className="mt-2">
              Generate
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
              highlight={code => highlight(code, languages.python)} // default to python
              padding={10}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
