import React from 'react';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import FileTree from './FileTree';

function HomeView({
  prompt,
  setPrompt,
  handleGenerate,
  isLoading,
  projects,
  handleLoadProject,
  handleExecuteProject,
  handlePlayProject,
  handleDeleteProject
}) {
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8}>
          <div className="text-center mb-4">
            <h1>Mini-UFO 4</h1>
            <p className="text-muted">Your AI programming assistant</p>
          </div>
          <Form.Group controlId="prompt-textarea">
            <Form.Control
              as="textarea"
              rows={6}
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
          <div className="d-flex justify-content-center mt-3">
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
          </div>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col md={8}>
          <h5>Recent Projects</h5>
          {projects.length === 0 ? (
            <p className="text-muted">No saved projects yet.</p>
          ) : (
            <FileTree
              tree={projects.map(p => ({ id: p.id, name: p.name, type: 'directory', created_at: p.created_at }))}
              onOpen={handleLoadProject}
              onRun={handleExecuteProject}
              onDelete={handleDeleteProject}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default HomeView;
