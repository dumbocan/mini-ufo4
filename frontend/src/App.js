import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Spinner, ToastContainer, Toast, Dropdown } from 'react-bootstrap';
import { House } from 'react-bootstrap-icons';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

import XTerm from './Terminal';
import FileTree from './FileTree';

import '../node_modules/@xterm/xterm/css/xterm.css';

import HomeView from './HomeView';
import ProjectView from './ProjectView';

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });

  // Projects + FileTree
  const [projects, setProjects] = useState([]);      // metadata plana
  const [fileTreeData, setFileTreeData] = useState([]); // árbol

  // Tema y navegación
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'project'
  const [currentProject, setCurrentProject] = useState(null); // objeto del proyecto activo

  // WS y terminal
  const socket = useRef(null);
  const reconnectTimer = useRef(null);
  const terminalRef = useRef(null);

  // Buffers
  const currentMessageBuffer = useRef('');
  const currentCodeBuffer = useRef('');

  // Tema
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark-mode' : 'light'));
  };

  // Fetch: proyectos + árbol
  const fetchProjectMetadata = useCallback(async () => {
    try {
      const res = await fetch('/projects');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching project metadata:', error);
      setToast({ show: true, message: `Error fetching project metadata: ${error.message}`, type: 'danger' });
    }
  }, []);

  const fetchFileTree = useCallback(async () => {
    try {
      const res = await fetch('/projects/tree');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setFileTreeData(data);
    } catch (error) {
      console.error('Error fetching file tree:', error);
      setToast({ show: true, message: `Error fetching file tree: ${error.message}`, type: 'danger' });
    }
  }, []);

  // Conexión WS
  const connectWebSocket = useCallback(() => {
    console.log('Attempting to connect WebSocket...');
    socket.current = new WebSocket(WS_URL);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      if (terminalRef.current) terminalRef.current.write('Connected to backend.\n');
      setIsConnected(true);
      setToast({ show: true, message: 'Connected to backend.', type: 'success' });

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      fetchProjectMetadata();
      fetchFileTree();

      // Automatically load the most recent project
      if (projects.length > 0) {
        const sortedProjects = [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        handleLoadSession(sortedProjects[0]);
      }
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
          writeToTerm('\n\x1b[36m--- CODE ---\x1b[0m\n'); // cyan
          writeToTerm(currentCodeBuffer.current + '\n');
          currentCodeBuffer.current = '';
        }
      };

      if (message.end_of_stream) {
        flushMessageBuffer();
        flushCodeBuffer();
        setIsLoading(false);
        writeToTerm('\n\x1b[32mTask finished.\x1b[0m\n'); // green
        setToast({ show: true, message: 'Task finished.', type: 'success' });
        return;
      }

      if (message.error) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm(`\n\x1b[31mError: ${message.error}\x1b[0m\n`); // red
        setToast({ show: true, message: `Error: ${message.error}`, type: 'danger' });
        setIsLoading(false);
        return;
      }

      if (message.type === 'message' && message.content) {
        flushCodeBuffer();
        currentMessageBuffer.current += message.content;
      } else if (message.type === 'code' && message.content) {
        flushMessageBuffer();
        currentCodeBuffer.current += message.content;
        setCode(prev => prev + message.content);
      } else if (message.type === 'console' && message.content) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm('\n\x1b[33m--- OUTPUT ---\x1b[0m\n'); // yellow
        writeToTerm(message.content + '\n');
      } else if (message.type === 'status' && message.content) {
        flushMessageBuffer();
        flushCodeBuffer();
        writeToTerm(`\x1b[34mStatus: ${message.content}\x1b[0m\n`); // blue ✅
      }
    };

    socket.current.onclose = () => {
      console.log('WebSocket disconnected');
      if (terminalRef.current) terminalRef.current.write('Disconnected from backend. Attempting to reconnect...\n');
      setIsConnected(false);
      setIsLoading(false);
      setToast({ show: true, message: 'Disconnected from backend. Attempting to reconnect...', type: 'warning' });

      if (!reconnectTimer.current) {
        reconnectTimer.current = setTimeout(() => connectWebSocket(), 5000);
      }
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (terminalRef.current) terminalRef.current.write('WebSocket connection error.\n');
      setToast({ show: true, message: 'WebSocket connection error.', type: 'danger' });
    };
  }, [fetchProjectMetadata, fetchFileTree]);

  useEffect(() => {
    connectWebSocket();

    const heartbeat = setInterval(() => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (socket.current) { try { socket.current.close(); } catch {} }
    };
  }, [connectWebSocket]);

  // Acciones UI
  const handleGenerate = () => {
    if (!prompt || !socket.current || socket.current.readyState !== WebSocket.OPEN) {
      if (terminalRef.current) terminalRef.current.write('Please enter a prompt and ensure you are connected to the backend.\n');
      setToast({ show: true, message: 'Please enter a prompt and ensure you are connected to the backend.', type: 'danger' });
    } else {
      setIsLoading(true);
      if (terminalRef.current) terminalRef.current.clear();
      setCode('');
      currentMessageBuffer.current = '';
      currentCodeBuffer.current = '';
      socket.current.send(prompt);
    }
  };

  const handleSaveSession = async () => {
    let console_output = '';
    if (terminalRef.current && typeof terminalRef.current.getBuffer === 'function') {
      try {
        console_output = terminalRef.current.getBuffer();
      } catch (e) {
        console.warn('Could not read terminal buffer:', e);
      }
    }

    const sessionContent = {
      prompt,
      code,
      console_output
    };

    try {
      const res = await fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionContent),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const newProject = await res.json();
      await fetchProjectMetadata();
      await fetchFileTree();
      if (terminalRef.current) terminalRef.current.write(`Session saved as: ${newProject.name}\n`);
      setToast({ show: true, message: `Session saved as: ${newProject.name}`, type: 'success' });
    } catch (error) {
      console.error('Error saving session:', error);
      setToast({ show: true, message: `Error saving session: ${error.message}`, type: 'danger' });
    }
  };

  const handleLoadSession = async (item) => {
    // item puede ser archivo o directorio; top-level es el ID de proyecto
    let projectId = item.id;
    if (item.type === 'file') {
      const parts = String(item.id).split('/');
      projectId = parts[0];
    }

    try {
      const res = await fetch(`/projects/${projectId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const projectContent = await res.json();
      console.log('Project content received:', projectContent);

      setPrompt(projectContent.prompt || '');
      setCode(projectContent.code || '');

      if (terminalRef.current) {
        terminalRef.current.clear();
        if (projectContent.console_output) {
          terminalRef.current.write(`${projectContent.console_output}\n`);
        }
        terminalRef.current.write(`Session loaded: ${projectId}\n`);
      }

      // Cambiar a vista de proyecto
      console.log('Setting currentView to project and currentProject:', { id: projectId, name: projectContent.name ?? projectId });
      setCurrentProject({ id: projectId, name: projectContent.name ?? projectId });
      setCurrentView('project');

      setToast({ show: true, message: `Session loaded: ${projectId}`, type: 'success' });
    } catch (error) {
      console.error('Error loading session:', error);
      setToast({ show: true, message: `Error loading session: ${error.message}`, type: 'danger' });
    }
  };

  const handleDeleteProject = async (item) => {
    let projectId = item.id;
    if (item.type === 'file') {
      const parts = String(item.id).split('/');
      projectId = parts[0];
    }

    try {
      const res = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchProjectMetadata();
      await fetchFileTree();
      if (terminalRef.current) terminalRef.current.write(`Project deleted: ${projectId}\n`);
      setToast({ show: true, message: `Project deleted: ${projectId}`, type: 'success' });

      // Si estabas en ese proyecto, vuelve a Home
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setCurrentView('home');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setToast({ show: true, message: `Error deleting project: ${error.message}`, type: 'danger' });
    }
  };

  const handlePlayProject = async (item) => {
    let projectId = item.id;
    if (item.type === 'file') {
      const parts = String(item.id).split('/');
      projectId = parts[0];
    }

    try {
      const res = await fetch(`/projects/${projectId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const projectContent = await res.json();

      setPrompt(projectContent.prompt || '');
      setCode(projectContent.code || '');

      if (terminalRef.current) {
        terminalRef.current.clear();
        terminalRef.current.write(`Loading code from ${item.name} for execution...\n`);
      }
      setToast({ show: true, message: `Loading code from ${item.name} for execution.`, type: 'info' });

      // Send the code to the backend for execution
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        setIsLoading(true);
        socket.current.send(projectContent.code);
      } else {
        setToast({ show: true, message: 'WebSocket not connected. Cannot execute code.', type: 'danger' });
      }

    } catch (error) {
      console.error('Error playing project:', error);
      setToast({ show: true, message: `Error playing project: ${error.message}`, type: 'danger' });
    }
  };

  const handleLoadProject = (p) => {
    // Abre vista de proyecto sin golpear backend (o podrías llamar a handleLoadSession)
    setCurrentProject(p);
    setCurrentView('project');
    handleLoadSession(p); // Call handleLoadSession to load the project content
  };

  // Estilo editor
  const editorStyle = {
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: 14,
    border: '1px solid var(--border-color)',
    borderRadius: '0.25rem',
    minHeight: '400px',
    backgroundColor: 'var(--input-bg-color)',
    color: 'var(--input-text-color)'
  };

  return (
    <Container fluid className={`app-container ${theme} pt-1`}>
      <ToastContainer position="top-end" className="p-2" style={{ zIndex: 1 }}>
        <Toast onClose={() => setToast({ ...toast, show: false })} show={toast.show} delay={5000} autohide bg={toast.type}>
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className={toast.type === 'danger' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Row className="app-header align-items-center mb-2">
        <Col className="text-start">
          {currentView === 'project' && (
            <Button variant="link" onClick={() => setCurrentView('home')} className="p-0 me-2" title="Back to Home">
              <House size={24} />
            </Button>
          )}
          <span className="mb-0 d-inline-block project-name-text">
            {currentView === 'home' ? 'Mini-UFO 4' : (currentProject?.name ?? currentProject?.id)}
          </span>
        </Col>
        <Col className="text-end">
          <span className={`status-badge me-2 ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Dropdown className="mt-1 d-inline-block">
            <Dropdown.Toggle variant="secondary" size="sm" id="dropdown-basic" className="menu-dropdown-toggle">
              Menu
            </Dropdown.Toggle>

            <Dropdown.Menu className="dropdown-menu-dark">
              <Dropdown.Item onClick={toggleTheme}>
                Toggle Theme ({theme === 'light' ? 'Dark' : 'Light'})
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {currentView === 'home' ? (
        <HomeView
          prompt={prompt}
          setPrompt={setPrompt}
          handleGenerate={handleGenerate}
          isLoading={isLoading}
          projects={projects}
          handleLoadProject={handleLoadProject}
          fileTreeData={fileTreeData}
          handleLoadSession={handleLoadSession}
          handlePlayProject={handlePlayProject}
          handleDeleteProject={handleDeleteProject}
        />
      ) : (
        <ProjectView
          prompt={prompt}
          setPrompt={setPrompt}
          code={code}
          setCode={setCode}
          isLoading={isLoading}
          handleGenerate={handleGenerate}
          handleSaveSession={handleSaveSession}
          terminalRef={terminalRef}
          fileTreeData={fileTreeData}
          handleLoadSession={handleLoadSession}
          handlePlayProject={handlePlayProject}
          handleDeleteProject={handleDeleteProject}
          currentProject={currentProject}
          editorStyle={editorStyle}
        />
      )}
    </Container>
  );
}

export default App;