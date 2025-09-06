import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Spinner, ToastContainer, Toast } from 'react-bootstrap';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

import XTerm from './Terminal';
import '@xterm/xterm/css/xterm.css';

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });
  const [projects, setProjects] = useState([]);

  const socket = useRef(null);
  const reconnectTimer = useRef(null);
  const terminalRef = useRef(null);

  const currentMessageBuffer = useRef(''); // Buffer para chunks tipo 'message'
  const currentCodeBuffer = useRef('');     // Buffer para chunks tipo 'code'

  const connectWebSocket = () => {
    console.log('Attempting to connect WebSocket...');
    socket.current = new WebSocket(WS_URL);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      if (terminalRef.current) {
        terminalRef.current.write('Connected to backend.\n');
      }
      setIsConnected(true);
      setToast({ show: true, message: 'Connected to backend.', type: 'success' });

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      fetchProjects();
    };

    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      const writeToTerm = (text, colorCode = '') => {
        if (terminalRef.current) {
          terminalRef.current.write(`${colorCode}${text}\x1b[0m`);
        }
      };

      const flushMessageBuffer = () => {
        if (currentMessageBuffer.current) {
          writeToTerm(currentMessageBuffer.current + '\n');
          currentMessageBuffer.current = '';
        }
      };

      const flushCodeBuffer = () => {
        if (currentCodeBuffer.current) {
          writeToTerm('\n\x1b[36m--- CODE ---\x1b[0m\n'); // Cyan
          writeToTerm(currentCodeBuffer.current + '\n');
          currentCodeBuffer.current = ''; // ✅ vaciado correcto
        }
      };

      if (message.end_of_stream) {
        flushMessageBuffer();
        flushCodeBuffer();
        setIsLoading(false);
        writeToTerm('\n\x1b[32mTask finished.\x1b[0m\n'); // Green
        setToast({ show: true, message: 'Task finished.', type: 'success' });
        return;
      }

      if (message.error) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm(`\n\x1b[31mError: ${message.error}\x1b[0m\n`); // Red
        setToast({ show: true, message: `Error: ${message.error}`, type: 'danger' });
        setIsLoading(false);
        return;
      }

      if (message.type === 'message' && message.content) {
        flushCodeBuffer(); // Si llega message, vacía code pendiente
        currentMessageBuffer.current += message.content;
      } else if (message.type === 'code' && message.content) {
        flushMessageBuffer(); // Si llega code, vacía message pendiente
        currentCodeBuffer.current += message.content;
        setCode(prevCode => prevCode + message.content);
      } else if (message.type === 'console' && message.content) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm('\n\x1b[33m--- OUTPUT ---\x1b[0m\n'); // Yellow
        writeToTerm(message.content + '\n');
      } else if (message.type === 'status' && message.content) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm(`\x1b[34mStatus: ${message.content}\x1b[0m\n`); // Blue
      }
      // Tipos desconocidos -> ignorar
    };

    socket.current.onclose = () => {
      console.log('WebSocket disconnected');
      if (terminalRef.current) {
        terminalRef.current.write('Disconnected from backend. Attempting to reconnect...\n');
      }
      setIsConnected(false);
      setIsLoading(false);
      setToast({ show: true, message: 'Disconnected from backend. Attempting to reconnect...', type: 'warning' });

      if (!reconnectTimer.current) {
        reconnectTimer.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (terminalRef.current) {
        terminalRef.current.write('WebSocket connection error.\n');
      }
      setToast({ show: true, message: 'WebSocket connection error.', type: 'danger' });
    };
  };

  useEffect(() => {
    connectWebSocket();

    const heartbeat = setInterval(() => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (socket.current) {
        try { socket.current.close(); } catch {}
      }
    };
  }, []);

  const handleGenerate = () => {
    if (!prompt || !socket.current || socket.current.readyState !== WebSocket.OPEN) {
      if (terminalRef.current) {
        terminalRef.current.write('Please enter a prompt and ensure you are connected to the backend.\n');
      }
      setToast({ show: true, message: 'Please enter a prompt and ensure you are connected to the backend.', type: 'danger' });
      return;
    }
    setIsLoading(true);
    if (terminalRef.current) {
      terminalRef.current.clear(); // Limpiar consola
    }
    setCode(''); // Limpiar código
    currentMessageBuffer.current = '';
    currentCodeBuffer.current = '';
    socket.current.send(prompt);
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/projects');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setToast({ show: true, message: `Error fetching projects: ${error.message}`, type: 'danger' });
    }
  };

  const handleSaveSession = async () => {
    let console_output = '';
    if (terminalRef.current) {
      console_output = terminalRef.current.getBuffer();
    }

    const sessionContent = {
      prompt: prompt,
      code: code,
      console_output: console_output
    };

    try {
      const response = await fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionContent),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newProject = await response.json();
      fetchProjects();
      if (terminalRef.current) {
        terminalRef.current.write(`Session saved as: ${newProject.name}\n`);
      }
      setToast({ show: true, message: `Session saved as: ${newProject.name}`, type: 'success' });
    } catch (error) {
      console.error("Error saving session:", error);
      setToast({ show: true, message: `Error saving session: ${error.message}`, type: 'danger' });
    }
  };

  const handleLoadSession = async (projectId) => {
    try {
      const response = await fetch(`/projects/${projectId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const projectContent = await response.json();

      setPrompt(projectContent.prompt || '');
      setCode(projectContent.code || '');

      if (terminalRef.current) {
        terminalRef.current.clear();
        if (projectContent.console_output) {
          terminalRef.current.write(`${projectContent.console_output}\n`);
        }
        terminalRef.current.write(`Session loaded: ${projectId}\n`);
      }

      setToast({ show: true, message: `Session loaded: ${projectId}`, type: 'success' });
    } catch (error) {
      console.error("Error loading session:", error);
      setToast({ show: true, message: `Error loading session: ${error.message}`, type: 'danger' });
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const response = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchProjects();
      if (terminalRef.current) {
        terminalRef.current.write(`Project deleted: ${projectId}\n`);
      }
      setToast({ show: true, message: `Project deleted: ${projectId}`, type: 'success' });
    } catch (error) {
      console.error("Error deleting project:", error);
      setToast({ show: true, message: `Error deleting project: ${error.message}`, type: 'danger' });
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

  return (
    <Container fluid className="p-3">
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
        <Toast onClose={() => setToast({ ...toast, show: false })} show={toast.show} delay={5000} autohide bg={toast.type}>
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className={toast.type === 'danger' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Row>
        <Col>
          <h1 className="mb-4">Mini-UFO 4</h1>
        </Col>
        <Col className="text-end">
          <p className="mt-2">
            Status:{' '}
            <span style={{ color: isConnected ? 'green' : 'red' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
        </Col>
      </Row>

      <Row>
        <Col md={6} style={{ height: '600px' }}>
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
            <Button
              variant="primary"
              onClick={handleGenerate}
              className="mt-2"
              disabled={isLoading || !socket.current || socket.current.readyState !== WebSocket.OPEN}
            >
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  {' Generating...'}
                </>
              ) : (
                'Generate'
              )}
            </Button>
            <Button
              variant="success"
              onClick={handleSaveSession}
              className="mt-2 ms-2"
              disabled={isLoading || !isConnected}
            >
              Save Session
            </Button>
            {/* Se elimina el botón "Load Session" sin ID para evitar errores */}
          </Form>

          <h5 className="mt-4">Console</h5>
          <XTerm ref={terminalRef} />

          <h5 className="mt-4">Saved Projects</h5>
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #ced4da',
              borderRadius: '0.25rem',
              padding: '10px'
            }}
          >
            {projects.length === 0 ? (
              <p>No saved projects yet.</p>
            ) : (
              <ul className="list-unstyled">
                {projects.map(project => (
                  <li key={project.id} className="d-flex justify-content-between align-items-center mb-2">
                    <span>{project.name} ({new Date(project.created_at).toLocaleString()})</span>
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleLoadSession(project.id)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Col>

        <Col md={6}>
          <h5>Generated Code</h5>
          {isLoading && (
            <div className="text-center my-3">
              <Spinner animation="border" role="status" aria-hidden="true" />
              <span>Generating code...</span>
            </div>
          )}
          <div style={editorStyle}>
            <Editor
              value={code}
              onValueChange={v => setCode(v)}
              highlight={code => highlight(code, languages.python)}
              padding={10}
              readOnly
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default App;