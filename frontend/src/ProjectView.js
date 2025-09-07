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
  handleDeleteProject,
  currentProject,
  editorStyle
}) {
  return (
    <>
      <Row className="mb-3">
        <Col lg={6}>
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
            <Button
              variant="success"
              onClick={handleSaveSession}
              disabled={isLoading}
            >
              Save Session
            </Button>
          </div>

          <h5 className="mt-4">File Tree</h5>
          <FileTree
            tree={fileTreeData}
            onOpen={handleLoadSession}
            onRun={handlePlayProject}
            onDelete={handleDeleteProject}
          />
        </Col>

        <Col lg={6}>
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