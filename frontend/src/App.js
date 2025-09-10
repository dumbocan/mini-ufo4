import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Spinner, ToastContainer, Toast, Dropdown, Modal } from 'react-bootstrap';
import { House, PlayFill, TrashFill } from 'react-bootstrap-icons';
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
  const [planFirst, setPlanFirst] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planText, setPlanText] = useState('');

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
  // Terminal write queue with backpressure
  const termQueueRef = useRef([]); // array of strings
  const termWritingRef = useRef(false);

  // Buffers
  const currentMessageBuffer = useRef('');
  const currentCodeBuffer = useRef('');
  const lastPromptRef = useRef(''); // New ref to store the last prompt
  const isPlanningRef = useRef(false);
  const planTextRef = useRef('');

  useEffect(() => { isPlanningRef.current = isPlanning; }, [isPlanning]);
  useEffect(() => { planTextRef.current = planText; }, [planText]);

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
  const processTermQueue = useCallback(() => {
    if (termWritingRef.current) return;
    if (!terminalRef.current) return;
    const next = termQueueRef.current.shift();
    if (typeof next !== 'string' || next.length === 0) return;
    termWritingRef.current = true;
    // Write and when flushed, continue
    try {
      terminalRef.current.write(next, () => {
        termWritingRef.current = false;
        // Yield to event loop to keep UI responsive
        setTimeout(processTermQueue, 0);
      });
    } catch {
      termWritingRef.current = false;
    }
  }, []);

  const enqueueTerm = useCallback((text) => {
    if (!text) return;
    // Chunk large strings to avoid overwhelming xterm
    const CHUNK = 2048;
    for (let i = 0; i < text.length; i += CHUNK) {
      termQueueRef.current.push(text.slice(i, i + CHUNK));
    }
    // Kick the processor
    processTermQueue();
  }, [processTermQueue]);

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

    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      const writeToTerm = (text, colorCode = '') => {
        enqueueTerm(`${colorCode}${text}\x1b[0m`);
      };

      const flushMessageBuffer = () => {
        if (currentMessageBuffer.current) {
          writeToTerm(currentMessageBuffer.current + '\n');
          currentMessageBuffer.current = '';
        }
      };

      const flushCodeBuffer = () => {
        // Avoid writing large code blobs to the terminal; it's shown in the editor.
        if (currentCodeBuffer.current) {
          const len = currentCodeBuffer.current.length;
          writeToTerm(`\n\x1b[36m[Code updated: ${len} chars]\x1b[0m\n`);
        }
      };

      if (message.end_of_stream) {
        // If we were in planning mode, show the plan modal and do not autosave
        if (isPlanningRef.current) {
          setIsPlanning(false);
          setIsLoading(false);
          setPlanText(planTextRef.current);
          setShowPlanModal(true);
          // Clear buffers for next stage
          currentMessageBuffer.current = '';
          currentCodeBuffer.current = '';
          return;
        }
        flushMessageBuffer();
        // Don't flush code buffer here yet.
        setIsLoading(false);
        writeToTerm('\n\x1b[32mTask finished.\x1b[0m\n'); // green
        setToast({ show: true, message: 'Task finished.', type: 'success' });

        // Capture console output before clearing terminal
        let console_output = '';
        if (terminalRef.current && typeof terminalRef.current.getBuffer === 'function') {
          try {
            console_output = terminalRef.current.getBuffer();
          } catch (e) {
            console.warn('Could not read terminal buffer:', e);
          }
        }

        // Automatically save and load the new project
        console.log('DEBUG: Values before handleSaveSession:');
        console.log('  lastPromptRef.current:', lastPromptRef.current);
        console.log('  currentCodeBuffer.current:', currentCodeBuffer.current);
        console.log('  console_output:', console_output);
        const newProject = await handleSaveSession(lastPromptRef.current, currentCodeBuffer.current, console_output);
        if (newProject) {
          handleLoadSession(newProject);
          // Refresh project metadata and file tree after saving a new project
          await fetchProjectMetadata();
          await fetchFileTree();
        }

        // Now report code update; do not dump full code into terminal
        flushCodeBuffer();
        if (terminalRef.current) terminalRef.current.clear();
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
        if (isPlanningRef.current) {
          // Accumulate plan text only in planning mode
          planTextRef.current += message.content;
        } else {
          currentMessageBuffer.current += message.content;
        }
      } else if (message.type === 'code' && message.content) {
        if (!isPlanningRef.current) {
          flushMessageBuffer();
          currentCodeBuffer.current += message.content;
          setCode(prev => prev + message.content);
        }
      } else if (message.type === 'console' && message.content) {
        flushMessageBuffer();
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
      currentMessageBuffer.current = '';
      currentCodeBuffer.current = '';
      console.log('Prompt before sending to WS:', prompt);
      lastPromptRef.current = prompt; // Store the prompt in the ref
      if (planFirst) {
        setIsPlanning(true);
        setPlanText('');
        planTextRef.current = '';
        socket.current.send(JSON.stringify({ intent: 'plan', prompt }));
      } else {
        socket.current.send(prompt);
      }
    }
  };

  const handleProceedImplementation = () => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setToast({ show: true, message: 'Not connected to backend.', type: 'danger' });
      return;
    }
    setShowPlanModal(false);
    setIsPlanning(false);
    setIsLoading(true);
    currentMessageBuffer.current = '';
    currentCodeBuffer.current = '';
    socket.current.send(JSON.stringify({ intent: 'implement', prompt: lastPromptRef.current, plan: planTextRef.current }));
  };

  const handleSaveSession = async (currentPrompt, generatedCode, consoleOutput) => {
    const sessionContent = {
      prompt: currentPrompt,
      code: generatedCode,
      console_output: consoleOutput
    };

    console.log('Saving session with prompt:', currentPrompt);
    console.log('Saving session with code:', generatedCode);
    console.log('Saving session with console_output:', consoleOutput);

    try {
      const res = await fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionContent),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const newProject = await res.json();
      // fetchProjectMetadata and fetchFileTree are already called in onopen and after save.
      // No need to call them here again, as handleLoadSession will trigger them.
      if (terminalRef.current) terminalRef.current.write(`Session saved as: ${newProject.name}\n`);
      setToast({ show: true, message: `Session saved as: ${newProject.name}`, type: 'success' });
      return newProject;
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

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectId}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      await fetchProjectMetadata();
      await fetchFileTree();

      if (terminalRef.current) terminalRef.current.write(`Project deleted: ${data.project_id}\n`);
      setToast({ show: true, message: `Project deleted: ${data.project_id}`, type: 'success' });

      // Si estabas en ese proyecto, vuelve a Home
      if (currentProject?.id === data.project_id) {
        setPrompt('');
        setCode('');
        setCurrentProject(null);
        setCurrentView('home');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setToast({ show: true, message: `Error deleting project: ${error.message}`, type: 'danger' });
    }
  };

  const handlePlayProject = async (project) => {
    // Primero, cargamos la sesión para asegurarnos de que el prompt y el código están en el estado
    await handleLoadSession(project);

    // handleGenerate usará el prompt del estado, que acabamos de cargar.
    // Usamos un pequeño timeout para asegurar que el estado de React se haya actualizado
    // antes de llamar a handleGenerate.
    setTimeout(() => {
      if (prompt) { // Verificamos que el prompt se haya cargado
        handleGenerate();
      }
    }, 0);
  };

  const handleExecuteProject = (item) => {
    // Si estamos en ProjectView y el editor contiene HTML, abre preview
    const looksLikeHTML = typeof code === 'string' && /<html|<!doctype/i.test(code);
    let projectId = item.id;
    if (item.type === 'file') {
      const parts = String(item.id).split('/');
      projectId = parts[0];
    }
    const url = looksLikeHTML
      ? `http://localhost:8000/projects/${projectId}/preview`
      : `http://localhost:8000/projects/${projectId}/run`;
    window.open(url, '_blank', 'noopener');
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
      <Modal show={showPlanModal} onHide={() => setShowPlanModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Proposed Plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 400, overflowY: 'auto' }}>
            {planText || '(empty)'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPlanModal(false)}>Revise</Button>
          <Button variant="primary" onClick={handleProceedImplementation}>Proceed</Button>
        </Modal.Footer>
      </Modal>
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
          planFirst={planFirst}
          setPlanFirst={setPlanFirst}
          projects={projects}
          handleLoadProject={handleLoadProject}
          fileTreeData={fileTreeData}
          handleLoadSession={handleLoadSession}
          handlePlayProject={handlePlayProject}
          handleExecuteProject={handleExecuteProject}
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
          handleExecuteProject={handleExecuteProject}
          handleDeleteProject={handleDeleteProject}
          currentProject={currentProject}
          editorStyle={editorStyle}
          planFirst={planFirst}
          setPlanFirst={setPlanFirst}
        />
      )}
    </Container>
  );
}

export default App;
