import React from 'react';
import { Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';

import XTerm from './Terminal';
import FileTree from './FileTree';

function ProjectView({
  prompt,
  setPrompt,
  code,
  setCode,
  isLoading,
  handleGenerate,
  handleSaveSession,
  terminalRef,
  fileTreeData,
  handleLoadSession,
  handlePlayProject,
  handleExecuteProject,
  handleDeleteProject,
  currentProject,
  editorStyle,
  planFirst,
  setPlanFirst,
  isPlanning,
  planText,
  planningReply,
  setPlanningReply,
  handlePlanClarify
}) {
  const filteredTree = Array.isArray(fileTreeData) && currentProject?.id
    ? fileTreeData.filter(n => n.id === currentProject.id)
    : fileTreeData;
  return (
    <>
      <Row className="mb-3">
        <Col lg={6}>
          {planFirst && (
            <div className="mb-3" style={{ border: '1px solid var(--border-color)', borderRadius: 4, padding: 8 }}>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Planning Chat</strong>
                {isPlanning && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #adb5bd)' }}>Thinking…</span>}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
                {planText || 'Sin plan aún. Pulsa Generate para empezar.'}
              </div>
              <div className="d-flex gap-2 mt-2">
                <Form.Control
                  type="text"
                  placeholder="Escribe una aclaración o preferencia (colores, imagen, estructura)..."
                  value={planningReply}
                  onChange={(e) => setPlanningReply(e.target.value)}
                  disabled={isPlanning}
                />
                <Button variant="outline-primary" onClick={handlePlanClarify} disabled={isPlanning || !planningReply.trim()}>
                  Ask
                </Button>
              </div>
            </div>
          )}
          <Form.Group controlId="prompt-textarea">
            <Form.Label>Your Prompt</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Plot the first 100 fibonacci numbers'"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--input-bg-color)',
                color: 'var(--input-text-color)',
                borderColor: 'var(--border-color)'
              }}
            />
          </Form.Group>
          <div className="d-flex gap-2 mt-2">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isLoading}
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
            <Form.Check
              type="checkbox"
              id="plan-first-project"
              className="align-self-center"
              label="Plan first"
              checked={planFirst}
              onChange={(e) => setPlanFirst(e.target.checked)}
            />
            <Button
              variant="success"
              onClick={() => handleSaveSession(
                prompt,
                code,
                (terminalRef?.current && typeof terminalRef.current.getBuffer === 'function')
                  ? terminalRef.current.getBuffer()
                  : ''
              )}
              disabled={isLoading}
            >
              Save Session
            </Button>
          </div>

          <h5 className="mt-4">File Tree</h5>
          <FileTree
            tree={filteredTree}
            onOpen={handleLoadSession}
            onRun={handleExecuteProject}
            onDelete={handleDeleteProject}
          />
        </Col>

        <Col lg={6}>
          <h5>
            Generated Code
            {isLoading && (
              <span className="ms-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted, #adb5bd)' }}>
                Streaming...
              </span>
            )}
          </h5>
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

          <h5 className="mt-4">Console</h5>
          <XTerm ref={terminalRef} />
        </Col>
      </Row>

      <div className="text-muted">
        <small>Project: {currentProject?.name ?? currentProject?.id}</small>
      </div>
    </>
  );
}

export default ProjectView;
